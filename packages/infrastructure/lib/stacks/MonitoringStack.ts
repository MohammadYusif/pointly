import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  apiGateway: apigateway.RestApi;
  lambdaFunctions: lambda.Function[];
  tables: dynamodb.Table[];
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, apiGateway, lambdaFunctions, tables } = props;

    // SNS Topic for alarms
    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      topicName: `Pointly-Alarms-${environment}`,
      displayName: "Pointly System Alarms",
    });

    // Add email subscription (replace with actual email later)
    // alarmTopic.addSubscription(
    //   new subscriptions.EmailSubscription('[email protected]')
    // );

    // API Gateway Alarms
    new cloudwatch.Alarm(this, "ApiHighErrorRate", {
      alarmName: `Pointly-API-HighErrorRate-${environment}`,
      metric: apiGateway.metricServerError({
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    new cloudwatch.Alarm(this, "ApiHighLatency", {
      alarmName: `Pointly-API-HighLatency-${environment}`,
      metric: apiGateway.metricLatency({
        statistic: "Average",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000, // 1 second
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    }).addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Lambda Alarms
    lambdaFunctions.forEach((fn, index) => {
      new cloudwatch.Alarm(this, `LambdaErrors-${index}`, {
        alarmName: `Pointly-Lambda-${fn.functionName}-Errors-${environment}`,
        metric: fn.metricErrors({
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

      new cloudwatch.Alarm(this, `LambdaThrottles-${index}`, {
        alarmName: `Pointly-Lambda-${fn.functionName}-Throttles-${environment}`,
        metric: fn.metricThrottles({
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    });

    // DynamoDB Alarms
    tables.forEach((table, index) => {
      new cloudwatch.Alarm(this, `DynamoDBReadThrottle-${index}`, {
        alarmName: `Pointly-DDB-${table.tableName}-ReadThrottle-${environment}`,
        metric: table.metricUserErrors({
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    });

    // Output
    new cdk.CfnOutput(this, "AlarmTopicArn", {
      value: alarmTopic.topicArn,
      exportName: `${environment}-AlarmTopicArn`,
    });
  }
}
