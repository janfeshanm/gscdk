import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "node:path";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
// import {
//   IEcsApplicationConstruct,
//   EcsApplicationConstruct,
// } from "./constructs/ecsApplication.construct";
// import {
//   IS3ReactApplicationConstruct,
//   S3ReactApplicationConstruct,
// } from "./constructs/s3ReactApplication.construct";
//import { eventbridgelambda } from "./constructs/eventbridge-lambda";
// import { dynamoDB } from "./constructs/dynamoDB.construct";
//import { cognitoEcsFargate } from "./constructs/cognitoEcsFargate.construct copy";
//import { sqsDirectIntegration } from "./constructs/sqsDirectIntegration.construct";

export class GscdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "MyFirstBucket", {
      bucketName: 'my-first-bucket-bbbbb-aaaaa',
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'DeployMyStringFile', {
      sources: [Source.data('abc.txt', 'GS CDK!')],
      destinationBucket: bucket,
    });

    const fnc = new lambda.Function(this, "GSFunction", {
      runtime: lambda.Runtime.NODEJS_22_X, // Provide any supported Node.js runtime
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "..", "..","gsms2","dist")),
      environment: { BUCKET_ARN: bucket.bucketArn },
    });

    fnc.addToRolePolicy(
          new PolicyStatement({
            actions: ["s3:*"],
            resources: ["arn:aws:s3:::*"],
          })
        );

    //new sqsDirectIntegration(this, 'SqsDirectIntegrationConstruct');
    //new cognitoEcsFargate(this, 'CognitoEcsFargateConstruct');

    // new dynamoDB(this, 'DynamoDBConstruct');
    //new eventbridgelambda(this, 'EventBridgeLambdaConstruct');

    // const ecsApplicationConstructProps: IEcsApplicationConstruct = {
    //   account: this.account,
    //   region: this.region,
    //   ecrConfig: {
    //     name: "nestjs-app-sample",
    //     id: "nestjs-app-sample",
    //   },
    //   ecsConfig: {
    //     clusterName: "SampleCluster",
    //     executionRole: {
    //       name: "fargate-test-task-execution-role",
    //       id: "fargate-test-task-execution-role",
    //     },
    //     taskDefinitionId: "sample-task-id",
    //     containerConfig: {
    //       id: "sample-task-container",
    //       name: "sample-task-container",
    //     },
    //   },
    //   pipelineConfig: {
    //     pipelineId: "nestJsBuildingApp",
    //     pipelineName: "nestJsBuildingApp",
    //     githubConfig: {
    //       owner: "janfeshanm",
    //       repo: "gsben",
    //       oAuthSecretManagerName: "GitHubToken",
    //       branch: "main",
    //     },
    //     buildSpecLocation: "./buildspec.yml",
    //   },
    // };

    // const ecsApplicationConstruct: EcsApplicationConstruct =
    //   new EcsApplicationConstruct(
    //     this,
    //     "ecsApplicationConstruct",
    //     ecsApplicationConstructProps
    //   );

    // const s3ReactApplicationConstructProps: IS3ReactApplicationConstruct = {
    //   bucketName: "MyReactAppBucket",
    //   apiUrl: ecsApplicationConstruct.apiUrl,
    //   githubConfig: {
    //     owner: "janfeshanm",
    //     repo: "gsfer",
    //     oAuthSecretManagerName: "GitHubToken",
    //     branch: "main",
    //   },
    // };
    // const s3ReactApplicationConstruct: S3ReactApplicationConstruct =
    //   new S3ReactApplicationConstruct(
    //     this,
    //     "s3ReactApplicationConstruct",
    //     s3ReactApplicationConstructProps
    //   );
  }
}
