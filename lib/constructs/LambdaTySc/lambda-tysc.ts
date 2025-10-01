import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
//import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

export class LambdaTySc extends Construct {
  public fncArn: NodejsFunction;
  constructor(scope: Construct, id: string, topicArn: string) {
    super(scope, id);
    const tyscFunction = new NodejsFunction(this, "function", {
      environment: { TOPIC_ARN: topicArn },
    });
    //new LambdaRestApi(this, 'apigw', {
    //  handler: tyscFunction,
    //});

    tyscFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["sns:publish"],
        resources: ["*"],
      })
    );
    this.fncArn = tyscFunction;
  }
}
