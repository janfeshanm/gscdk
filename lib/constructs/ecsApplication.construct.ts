import { Construct } from "constructs";
import { IRepository, Repository } from "aws-cdk-lib/aws-ecr";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  AwsLogDriver,
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateTaskDefinition,
  OperatingSystemFamily,
  Protocol,
} from "aws-cdk-lib/aws-ecs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger,
  ManualApprovalAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { aws_certificatemanager, SecretValue } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { PublicHostedZone } from "aws-cdk-lib/aws-route53";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
interface ICreateEcrImage {
  name: string;
  id: string;
}

interface IExecutionRole {
  id: string;
  name: string;
}

interface IPipelineConfig {
  pipelineName: string;
  pipelineId: string;
  githubConfig: {
    owner: string;
    repo: string;
    oAuthSecretManagerName: string;
    branch: string;
  };
  buildSpecLocation: string;
}

interface ICreateEcs {
  executionRole: IExecutionRole;
  taskDefinitionId: string;
  clusterName: string;
  containerConfig: {
    id: string;
    name: string;
  };
}

export interface IEcsApplicationConstruct {
  account: string;
  region: string;
  ecrConfig: ICreateEcrImage;
  ecsConfig: ICreateEcs;
  pipelineConfig: IPipelineConfig;
}
export class EcsApplicationConstruct extends Construct {
  constructor(scope: Construct, id: string, _props: IEcsApplicationConstruct) {
    super(scope, id);

    const ecr = this.createEcrImage(_props.ecrConfig);

    const pipeline = this.createBuildPipeline(
      _props.pipelineConfig,
      _props.account,
      _props.region,
      ecr
    );

    this.attachDeployAction(
      pipeline.pipeline,
      pipeline.output,
      ecr.repositoryUri,
      _props
    );
  }

  public apiUrl: string = "";

  attachDeployAction(
    pipeline: Pipeline,
    buildOutput: Artifact,
    repositoryUri: string,
    _props: IEcsApplicationConstruct
  ) {
    const ecs = this.createEcs(
      _props.ecsConfig,
      _props.account,
      _props.region,
      repositoryUri
    );

    this.apiUrl = `http://${ecs.service.loadBalancer.loadBalancerDnsName}`;

    const updatetaskdefinition = new PipelineProject(
      this,
      `InvalidateProject`,
      {
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            build: {
              commands: [
                `aws ecs update-service --cluster ${ecs.cluster.clusterName} --service ${ecs.service.service.serviceArn} --force-new-deployment`,
              ],
            },
          },
        }),
      }
    );

    updatetaskdefinition.addToRolePolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["ecs:*"],
        effect: Effect.ALLOW,
      })
    );

    pipeline.addStage({
      stageName: "UpdateService",
      actions: [
        new CodeBuildAction({
          actionName: "UpdateService",
          project: updatetaskdefinition,
          input: buildOutput,
        }),
      ],
    });
  }

  createBuildPipeline(
    _props: IPipelineConfig,
    account: string,
    region: string,
    repo: IRepository
  ) {
    const outputSources: Artifact = new Artifact();
    const outputWebsite: Artifact = new Artifact();

    const sourceAction: GitHubSourceAction = new GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: _props.githubConfig.owner,
      repo: _props.githubConfig.repo,
      oauthToken: SecretValue.secretsManager(
        _props.githubConfig.oAuthSecretManagerName
      ),
      output: outputSources,
      branch: _props.githubConfig.branch,
      trigger: GitHubTrigger.WEBHOOK,
    });

    const buildProject = new PipelineProject(this, "BuildWebsite", {
      projectName: "BuildWebsite",
      buildSpec: BuildSpec.fromSourceFilename(_props.buildSpecLocation),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          AWS_REGION: { value: region },
          AWS_ACCOUNT: { value: account },
          ECR_REPO: { value: repo.repositoryName },
        },
      },
    });

    buildProject.addToRolePolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["ecr:*"],
        effect: Effect.ALLOW,
      })
    );

    const buildAction: CodeBuildAction = new CodeBuildAction({
      actionName: "BuildWebsite",
      project: buildProject,
      input: outputSources,
      outputs: [outputWebsite],
    });

    const pipeline: Pipeline = new Pipeline(this, _props.pipelineId, {
      pipelineName: _props.pipelineName,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
      ],
    });

    const approveStage = pipeline.addStage({ stageName: "Approve" });
    const manualApprovalAction = new ManualApprovalAction({
      actionName: "Approve",
    });
    approveStage.addAction(manualApprovalAction);

    return {
      pipeline: pipeline,
      output: outputSources,
    };
  }

  private createEcs(
    _props: ICreateEcs,
    _account: string,
    _region: string,
    _ecrName: string
  ) {
    const executionRole: Role = new Role(this, _props.executionRole.id, {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: _props.executionRole.name,
    });
    executionRole.addToPolicy(
      new PolicyStatement({
        resources: ["*"], //to be the ecr resource
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        effect: Effect.ALLOW,
      })
    );

    const taskDefinition: FargateTaskDefinition = new FargateTaskDefinition(
      this,
      _props.taskDefinitionId,
      {
        executionRole: executionRole,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      }
    );

    const container = taskDefinition.addContainer(_props.containerConfig.id, {
      image: ContainerImage.fromRegistry(_ecrName),
      containerName: _props.containerConfig.name,
      essential: true,
      portMappings: [
        {
          containerPort: 8080,
          protocol: Protocol.TCP,
        },
      ],
      logging: new AwsLogDriver({
        streamPrefix: `${_props.containerConfig.name}-ecs-logs`,
      }),
    });

    const vpc = new Vpc(this, `${_props.containerConfig.name}-vpc`, {});

    //--------------------------------
    const certificate = aws_certificatemanager.Certificate.fromCertificateArn(
      this,
      '80a67206-6ccf-4d1a-bd4b-c33660060670', 'arn:aws:acm:ap-southeast-2:016491065640:certificate/80a67206-6ccf-4d1a-bd4b-c33660060670'
    );
    //--------------------------------

    const cluster: Cluster = new Cluster(
      this,
      `${_props.containerConfig.name}-cluster`,
      {
        clusterName: _props.clusterName,
        vpc,
      }
    );

    const albfg: ApplicationLoadBalancedFargateService =
      new ApplicationLoadBalancedFargateService(this, "MyFargateService", {
        serviceName: `${_props.containerConfig.name}-service`,
        cluster: cluster, // Required
        cpu: 256, // Default is 256
        desiredCount: 1, // Default is 1
        taskDefinition: taskDefinition,
        memoryLimitMiB: 512, // Default is 512
        publicLoadBalancer: true, // Default is false
        loadBalancerName: `${_props.containerConfig.name}-ALB`,
        // Configure for HTTPS
        protocol: ApplicationProtocol.HTTPS,
        certificate,
        domainName: "gsben.sprocms.com", // Your domain name
        domainZone: PublicHostedZone.fromHostedZoneAttributes(
          this,
          "Z088448932PKT5BNTDMR9",
          {
            hostedZoneId: "Z088448932PKT5BNTDMR9",
            zoneName: "sprocms.com",
          }
        ),
        redirectHTTP: true, // Optional: Redirect HTTP to HTTPS
      });

    return {
      cluster: cluster,
      service: albfg,
    };
  }

  private createEcrImage(_props: ICreateEcrImage) {
    const repository = Repository.fromRepositoryName(
      this,
      "ExistingRepositoryByName",
      _props.name
    );
    return repository;
  }
}
