import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IEcsApplicationConstruct, EcsApplicationConstruct } from './constructs/ecsApplication.construct';
import { Repository } from 'aws-cdk-lib/aws-ecr';

export class GscdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
const ecsApplicationConstructProps :IEcsApplicationConstruct ={
            account:this.account,
            region:this.region,
            ecrConfig:{
                name:"nestjs-app-sample",
                id:"nestjs-app-sample",
            },
            ecsConfig:{
                clusterName:"SampleCluster",
                executionRole:{
                    name:"fargate-test-task-execution-role",
                    id:"fargate-test-task-execution-role"
                },
                taskDefinitionId:"sample-task-id",
                containerConfig:{
                    id:"sample-task-container",
                    name:"sample-task-container"
                },
            },
            pipelineConfig:{
                    pipelineId:"nestJsBuildingApp",
                    pipelineName:"nestJsBuildingApp",
                    githubConfig:{
                        owner:"janfeshanm",
                        repo:"gsben",
                        oAuthSecretManagerName:"GitHubToken",
                        branch:"main"
                    },
                    buildSpecLocation:"./buildspec.yml"
                }
            }

        const ecsApplicationConstruct: EcsApplicationConstruct = new EcsApplicationConstruct(this,"ecsApplicationConstruct",ecsApplicationConstructProps)
  }
}
