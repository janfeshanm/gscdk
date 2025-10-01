import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export class dynamoDB extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

const tableName = 'friends';

    // Create a table
    const table = new Table(this, 'FriendsTable', {
      tableName,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new AwsCustomResource(this, 'initDBResource', {
      onCreate: {
        service: 'DynamoDB',
        action: 'putItem',
        parameters: {
          TableName: tableName,
          Item: {
      id: { S: "8524716b-1691-4314-a6ab-494aa191f230" },
      firstName: { S: "Jonathan" },
      lastName: { S: "Janfeshan" },
      favoriteColor: { S: "Blue" },
    },
        },
        physicalResourceId: PhysicalResourceId.of('initDBData'),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [table.tableArn] }),
    });

  }
}
