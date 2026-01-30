import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface ApiStackProps extends cdk.StackProps {
  environment: string;
  userLedgerTable: dynamodb.Table;
  transactionAuditTable: dynamodb.Table;
  idempotencyTable: dynamodb.Table;
  qrNonceTable: dynamodb.Table;
  pendingConsentsTable: dynamodb.Table;
  smsQuotaTable: dynamodb.Table;
  merchantUserPool: cognito.UserPool;
  customerUserPool: cognito.UserPool;
}

export class ApiStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;
  public readonly lambdaFunctions: lambda.Function[];

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // SQS Queue for SMS notifications
    const smsQueue = new sqs.Queue(this, "SMSQueue", {
      queueName: `Pointly-SMSQueue-${environment}`,
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, "SMSDeadLetterQueue", {
          queueName: `Pointly-SMSQueue-DLQ-${environment}`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // Lambda Execution Role
    const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    // Grant DynamoDB permissions
    props.userLedgerTable.grantReadWriteData(lambdaRole);
    props.transactionAuditTable.grantReadWriteData(lambdaRole);
    props.idempotencyTable.grantReadWriteData(lambdaRole);
    props.qrNonceTable.grantReadWriteData(lambdaRole);
    props.pendingConsentsTable.grantReadWriteData(lambdaRole);
    props.smsQuotaTable.grantReadWriteData(lambdaRole);

    // Grant SQS permissions
    smsQueue.grantSendMessages(lambdaRole);

    // Common environment variables for all lambdas
    const commonEnv = {
      ENVIRONMENT: environment,
      USER_LEDGER_TABLE: props.userLedgerTable.tableName,
      TRANSACTION_TABLE: props.transactionAuditTable.tableName,
      IDEMPOTENCY_TABLE: props.idempotencyTable.tableName,
      QR_NONCE_TABLE: props.qrNonceTable.tableName,
      PENDING_CONSENTS_TABLE: props.pendingConsentsTable.tableName,
      SMS_QUOTA_TABLE: props.smsQuotaTable.tableName,
      SMS_QUEUE_URL: smsQueue.queueUrl,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    };

    // Placeholder Lambda (we'll replace with actual functions later)
    const apiLambda = new lambda.Function(this, "ApiFunction", {
      functionName: `Pointly-Api-${environment}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Pointly API - Coming Soon',
              version: '1.0.0',
              environment: '${environment}',
            }),
          };
        };
      `),
      environment: commonEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // API Gateway
    this.apiGateway = new apigateway.RestApi(this, "ApiGateway", {
      restApiName: `Pointly-API-${environment}`,
      description: "Pointly Loyalty Platform API",
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Date",
          "X-Amz-Security-Token",
        ],
      },
    });

    // Cognito Authorizer for merchants
    const merchantAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "MerchantAuthorizer",
      {
        cognitoUserPools: [props.merchantUserPool],
        authorizerName: "MerchantAuthorizer",
      },
    );

    // Cognito Authorizer for customers
    const customerAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "CustomerAuthorizer",
      {
        cognitoUserPools: [props.customerUserPool],
        authorizerName: "CustomerAuthorizer",
      },
    );

    // API Resources
    const v1 = this.apiGateway.root.addResource("v1");

    // Health check (public)
    const health = v1.addResource("health");
    health.addMethod("GET", new apigateway.LambdaIntegration(apiLambda));

    // Merchant endpoints (protected)
    const merchants = v1.addResource("merchants");
    merchants.addMethod("GET", new apigateway.LambdaIntegration(apiLambda), {
      authorizer: merchantAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Customer endpoints (protected)
    const customers = v1.addResource("customers");
    customers.addMethod("GET", new apigateway.LambdaIntegration(apiLambda), {
      authorizer: customerAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    this.lambdaFunctions = [apiLambda];

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.apiGateway.url,
      exportName: `${environment}-ApiUrl`,
    });

    new cdk.CfnOutput(this, "ApiId", {
      value: this.apiGateway.restApiId,
      exportName: `${environment}-ApiId`,
    });
  }
}
