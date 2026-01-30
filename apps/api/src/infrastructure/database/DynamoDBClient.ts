import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import EnvironmentConfig from "../config/Environment";

class DynamoDBClientFactory {
  private static documentClient: DynamoDBDocumentClient;

  static getDocumentClient(): DynamoDBDocumentClient {
    if (!this.documentClient) {
      this.documentClient = this.createDocumentClient();
    }
    return this.documentClient;
  }

  private static createDocumentClient(): DynamoDBDocumentClient {
    const env = EnvironmentConfig.get();

    const clientConfig = {
      region: env.AWS_REGION,
      ...(env.DYNAMODB_ENDPOINT && {
        endpoint: env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }),
    };

    const client = new DynamoDBClient(clientConfig);

    const documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    return documentClient;
  }

  static resetClient(): void {
    this.documentClient = this.createDocumentClient();
  }
}

export default DynamoDBClientFactory;
