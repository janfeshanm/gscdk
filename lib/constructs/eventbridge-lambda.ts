import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import {
  Function as Fnc,
} from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { LambdaTySc } from "./LambdaTySc/lambda-tysc";
import { Duration } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
export class eventbridgelambda extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const topic = new Topic(this, "Topic", {
      displayName: "Lambda SNS Topic",
    });

    topic.addSubscription(new EmailSubscription("jsoufi.au@gmail.com"));

    const rule = new Rule(this, "Rule", {
      schedule: Schedule.rate(Duration.minutes(2)),//Schedule.expression("cron(* * ? * * *)"),
    });

    const pub = new LambdaTySc(this, 'Lambda-TySc', topic.topicArn);

    rule.addTarget(new targets.LambdaFunction(pub.fncArn));

  }
}
