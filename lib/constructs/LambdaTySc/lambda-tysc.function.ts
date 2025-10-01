import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: "ap-southeast-2" }); // Replace with your region


    export const handler = async (_event: unknown): Promise<any> => {
      try {

        const command = new PublishCommand({
          Message: "Hello from Lambda!",
          TopicArn: process.env.TOPIC_ARN, // Ensure this environment variable is set
        });

        const response = await snsClient.send(command);
        console.log("Message published successfully:", response.MessageId);
        return { statusCode: 200, body: JSON.stringify({ messageId: response.MessageId }) };
      } catch (error) {
        console.error("Error publishing message:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to publish message" }) };
      }
    };