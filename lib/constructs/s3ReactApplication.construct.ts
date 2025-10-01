import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  BuildSpec,
  EventAction,
  FilterGroup,
  GitHubSourceCredentials,
  LinuxBuildImage,
  Project,
  ProjectProps,
  Source as Src,
} from "aws-cdk-lib/aws-codebuild";
import { SecretValue } from "aws-cdk-lib";
import {
    CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger,
  S3DeployAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { ARecord, PublicHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

const SECRET_ARN = 'arn:aws:secretsmanager:ap-southeast-2:016491065640:secret:GitHubToken-NO8rZX'

export interface IS3ReactApplicationConstruct {
  bucketName: string;
  apiUrl: string;
  githubConfig: {
    owner: string;
    repo: string;
    oAuthSecretManagerName: string;
    branch: string;
  };
}

export class S3ReactApplicationConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    _props: IS3ReactApplicationConstruct
  ) {
    super(scope, id);

    const bucket = new Bucket(this, _props.bucketName, {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      enforceSSL: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    //---------------------------------------------

    const distribution = new Distribution(this, "MyReactAppDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
      },
      domainNames: ['gsfer.sprocms.com'],
      defaultRootObject: "index.html",
      certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(this, 'bdb5c54a-d0de-430e-84b6-0d8a36cc880f', 'arn:aws:acm:us-east-1:016491065640:certificate/bdb5c54a-d0de-430e-84b6-0d8a36cc880f'),
    });

    new ARecord(this, 'CustomDomainAliasRecord', {
      zone: PublicHostedZone.fromHostedZoneAttributes(this, 'Z088448932PKT5BNTDMR9', {
        hostedZoneId: 'Z088448932PKT5BNTDMR9',
        zoneName: 'sprocms.com'
      }),
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      recordName: 'gsfer.sprocms.com',
    });


    new BucketDeployment(this, 'DeployMyStringFile', {
      sources: [Source.data('api.txt', _props.apiUrl)],
      destinationBucket: bucket,
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionUrl", {
      value: distribution.distributionDomainName,
      description: "The URL of the CloudFront distribution",
    });
    //--------------------------------------------------


    new GitHubSourceCredentials(this, 'code-build-credentials', {
            accessToken: SecretValue.secretsManager('GitHubToken')
        })

    const source = Src.gitHub({
      owner: _props.githubConfig.owner,
      repo: _props.githubConfig.repo,
      webhook: true,
      webhookFilters: [
        FilterGroup.inEventOf(EventAction.PUSH).andBranchIs(
          _props.githubConfig.branch
        ),
      ],
    });

    //const buildSpec = this.getBuildSpec();
    const project = new Project(this, "project", {
      projectName: "pipeline-project",
      source,
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      buildSpec: BuildSpec.fromSourceFilename("./buildspec.yml"),
    });

    project.addToRolePolicy(new PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [SECRET_ARN]
        }))
    bucket.grantReadWrite(project.grantPrincipal)
    bucket.grantReadWrite(project.grantPrincipal);

    const artifacts = {
      source: new Artifact("Source"),
      build: new Artifact("BuildOutput"),
    };
    const pipelineActions = {
      source: new GitHubSourceAction({
            actionName: 'Github',
            owner: _props.githubConfig.owner,
            repo: _props.githubConfig.repo,
            oauthToken: SecretValue.secretsManager(_props.githubConfig.oAuthSecretManagerName),
            output: artifacts.source,
            branch: _props.githubConfig.branch,
            trigger: GitHubTrigger.WEBHOOK
        }),
      build: new CodeBuildAction({
        actionName: "CodeBuild",
        project,
        input: artifacts.source,
        outputs: [artifacts.build],
      }),
      deploy: new S3DeployAction({
        actionName: "S3Deploy",
        bucket: bucket,
        input: artifacts.build,
      }),
    };

    const pipeline = new Pipeline(this, "DeployPipeline", {
      pipelineName: `s3-pipeline`,
      stages: [
        { stageName: "Source", actions: [pipelineActions.source] },
        { stageName: "Build", actions: [pipelineActions.build] },
        { stageName: "Deploy", actions: [pipelineActions.deploy] },
      ],
    });

    
  }
}
