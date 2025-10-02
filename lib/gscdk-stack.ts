import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import {
//   IEcsApplicationConstruct,
//   EcsApplicationConstruct,
// } from "./constructs/ecsApplication.construct";
// import {
//   IS3ReactApplicationConstruct,
//   S3ReactApplicationConstruct,
// } from "./constructs/s3ReactApplication.construct";
// import { eventbridgelambda } from "./constructs/eventbridge-lambda";
// import { dynamoDB } from "./constructs/dynamoDB.construct";
import { cognitoEcsFargate } from "./constructs/cognitoEcsFargate.construct copy";

export class GscdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new cognitoEcsFargate(this, 'CognitoEcsFargateConstruct');

    // new dynamoDB(this, 'DynamoDBConstruct');
    // new eventbridgelambda(this, 'EventBridgeLambdaConstruct');

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
