import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import EnvironmentConfig from '../config/Environment';

let documentClient: DynamoDBDocumentClient;

function createDocumentClient(): DynamoDBDocumentClient {
  const env = EnvironmentConfig.get();

  const clientConfig = {
    region: env.AWS_REGION,
    ...(env.DYNAMODB_ENDPOINT && {
      endpoint: env.DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
    }),
  };

  const client = new DynamoDBClient(clientConfig);

  const newDocumentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });

  return newDocumentClient;
}

function getDocumentClient(): DynamoDBDocumentClient {
  if (!documentClient) {
    documentClient = createDocumentClient();
  }
  return documentClient;
}

function resetClient(): void {
  documentClient = createDocumentClient();
}

const DynamoDBClientFactory = {
  getDocumentClient,
  resetClient,
};

export default DynamoDBClientFactory;
