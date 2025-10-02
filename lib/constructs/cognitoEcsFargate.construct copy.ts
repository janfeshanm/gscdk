import { AccountRecovery, OAuthScope, UserPool, UserPoolClientIdentityProvider, UserPoolDomain, CfnUserPoolUser, CfnUserPoolUserProps } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { aws_certificatemanager, Lazy } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AwsLogDriver, Cluster, ContainerImage, CpuArchitecture, FargateTaskDefinition, OperatingSystemFamily, Protocol } from "aws-cdk-lib/aws-ecs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { ApplicationProtocol, CfnListener, ListenerAction, ListenerCondition } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { PublicHostedZone } from "aws-cdk-lib/aws-route53";

export class cognitoEcsFargate extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const domainName = 'abc.sprocms.com';

    const userPool = new UserPool(this, 'MyUserPool', {
      userPoolName: 'rag-demo-pool',
      selfSignUpEnabled: true, // Enable self sign-up
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      signInAliases: { email: true }, // Set email as an alias
      autoVerify: { email: true },
    });

    const userPoolDomain = new UserPoolDomain(this, 'MyUserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: 'rag-demo', // Choose a unique domain prefix
      },
    });

    const userPoolClient = userPool.addClient('MyUserPoolClient', {
      userPoolClientName: 'rag-demo-client',
      idTokenValidity: cdk.Duration.days(1),
      accessTokenValidity: cdk.Duration.days(1),
      generateSecret: true,
      oAuth: {
        callbackUrls: [
          Lazy.string({ produce: () => `https://${domainName}/oauth2/idpresponse` }),
          Lazy.string({ produce: () => `https://${domainName}` }),
        ],
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID],
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });

new CfnUserPoolUser(this, 'MyCognitoUser', {
  userPoolId: userPool.userPoolId,
  username: 'jsoufi.au@gmail.com',
});

    //-------------------------------------------------------------
        const executionRole: Role = new Role(this, 'execRoleId', {
          assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
          roleName: 'execRoleName',
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
          'taskDefId',
          {
            executionRole: executionRole,
            runtimePlatform: {
              cpuArchitecture: CpuArchitecture.X86_64,
              operatingSystemFamily: OperatingSystemFamily.LINUX,
            },
          }
        );
    
        const container = taskDefinition.addContainer('containerId', {
          image: ContainerImage.fromRegistry('016491065640.dkr.ecr.ap-southeast-2.amazonaws.com/nestjs-app-sample:9d37595'),
          containerName: 'nestjs-app-sample',
          essential: true,
          portMappings: [
            {
              containerPort: 8080,
              protocol: Protocol.TCP,
            },
          ],
          logging: new AwsLogDriver({
            streamPrefix: 'nestjs-app-sample-ecs-logs',
          }),
        });
    
        const vpc = new Vpc(this, 'nestjs-app-sample-vpc', {});
    
        //--------------------------------
        const certificate = aws_certificatemanager.Certificate.fromCertificateArn(
          this,
          '80a67206-6ccf-4d1a-bd4b-c33660060670', 'arn:aws:acm:ap-southeast-2:016491065640:certificate/80a67206-6ccf-4d1a-bd4b-c33660060670'
        );
        //--------------------------------
    
        const cluster: Cluster = new Cluster(
          this,
          'sample-task-container-cluster',
          {
            clusterName: 'sample-task-container-cluster',
            vpc,
          }
        );
    
        const appService : ApplicationLoadBalancedFargateService =
          new ApplicationLoadBalancedFargateService(this, "MyFargateService", {
            serviceName: 'sample-task-container-service',
            cluster: cluster, // Required
            cpu: 256, // Default is 256
            desiredCount: 1, // Default is 1
            taskDefinition: taskDefinition,
            memoryLimitMiB: 512, // Default is 512
            publicLoadBalancer: true, // Default is false
            loadBalancerName: 'sample-task-container-ALB',
            // Configure for HTTPS
            protocol: ApplicationProtocol.HTTPS,
            certificate,
            domainName: domainName, // Your domain name
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

          appService.listener.addAction('authenticate-rule', {
  priority: 1000,
  action: new cdk.aws_elasticloadbalancingv2_actions.AuthenticateCognitoAction({
    next: ListenerAction.forward([appService.targetGroup]),
    userPool: userPool,
    userPoolClient: userPoolClient,
    userPoolDomain: userPoolDomain,
  }),
  conditions: [ListenerCondition.hostHeaders([domainName])],
});

const cfnListener = appService.listener.node.defaultChild as CfnListener;
cfnListener.defaultActions = [{
  type: 'fixed-response',
  fixedResponseConfig: {
    statusCode: '403',
    contentType: 'text/plain',
    messageBody: 'This is not a valid endpoint!',
  },
}];

  }
}
