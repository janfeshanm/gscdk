import { AwsIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class sqsDirectIntegration extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

        // role
    const integrationRole = new Role(this, 'integration-role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    // queue
    const queue = new Queue(this, 'queue', {
      encryption: QueueEncryption.KMS_MANAGED,
    });

    // grant sqs:SendMessage* to Api Gateway Role
    queue.grantSendMessages(integrationRole);

    // Api Gateway Direct Integration
    const sendMessageIntegration = new AwsIntegration({
      service: 'sqs',
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${queue.queueName}`,
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: integrationRole,
        requestParameters: {
          'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          'application/json': 'Action=SendMessage&MessageBody=$input.body',
        },
        integrationResponses: [
          {
            statusCode: '200',
          },
          {
            statusCode: '400',
          },
          {
            statusCode: '500',
          }
        ]
      },
    });

    // Rest Api
    const api = new RestApi(this, 'api', {});

    // post method
    api.root.addMethod('POST', sendMessageIntegration, {
      methodResponses: [
        {
          statusCode: '400',
        },
        { 
          statusCode: '200',
        },
        {
          statusCode: '500',
        }
      ]
    });

  }
}
