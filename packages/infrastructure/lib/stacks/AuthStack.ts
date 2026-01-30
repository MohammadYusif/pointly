import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

interface AuthStackProps extends cdk.StackProps {
  environment: string;
}

export class AuthStack extends cdk.Stack {
  public readonly merchantUserPool: cognito.UserPool;
  public readonly merchantUserPoolClient: cognito.UserPoolClient;
  public readonly customerUserPool: cognito.UserPool;
  public readonly customerUserPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Merchant User Pool
    this.merchantUserPool = new cognito.UserPool(this, "MerchantUserPool", {
      userPoolName: `Pointly-Merchants-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        merchantId: new cognito.StringAttribute({ mutable: false }),
        businessName: new cognito.StringAttribute({ mutable: true }),
        tier: new cognito.StringAttribute({ mutable: true }), // basic, professional, premium
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy:
        environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Merchant User Pool Client
    this.merchantUserPoolClient = this.merchantUserPool.addClient(
      "MerchantWebClient",
      {
        userPoolClientName: `Pointly-MerchantWeb-${environment}`,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        generateSecret: false,
        preventUserExistenceErrors: true,
        refreshTokenValidity: cdk.Duration.days(30),
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
      },
    );

    // Customer User Pool
    this.customerUserPool = new cognito.UserPool(this, "CustomerUserPool", {
      userPoolName: `Pointly-Customers-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        phone: true,
      },
      autoVerify: {
        phone: true,
      },
      standardAttributes: {
        phoneNumber: {
          required: true,
          mutable: false,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        customerId: new cognito.StringAttribute({ mutable: false }),
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: false,
      },
      accountRecovery: cognito.AccountRecovery.PHONE_WITHOUT_MFA_AND_EMAIL,
      removalPolicy:
        environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Customer User Pool Client
    this.customerUserPoolClient = this.customerUserPool.addClient(
      "CustomerWebClient",
      {
        userPoolClientName: `Pointly-CustomerWeb-${environment}`,
        authFlows: {
          userPassword: true,
          userSrp: true,
          custom: true,
        },
        generateSecret: false,
        preventUserExistenceErrors: true,
        refreshTokenValidity: cdk.Duration.days(90),
        accessTokenValidity: cdk.Duration.hours(24),
        idTokenValidity: cdk.Duration.hours(24),
      },
    );

    // Outputs
    new cdk.CfnOutput(this, "MerchantUserPoolId", {
      value: this.merchantUserPool.userPoolId,
      exportName: `${environment}-MerchantUserPoolId`,
    });

    new cdk.CfnOutput(this, "MerchantUserPoolClientId", {
      value: this.merchantUserPoolClient.userPoolClientId,
      exportName: `${environment}-MerchantUserPoolClientId`,
    });

    new cdk.CfnOutput(this, "CustomerUserPoolId", {
      value: this.customerUserPool.userPoolId,
      exportName: `${environment}-CustomerUserPoolId`,
    });

    new cdk.CfnOutput(this, "CustomerUserPoolClientId", {
      value: this.customerUserPoolClient.userPoolClientId,
      exportName: `${environment}-CustomerUserPoolClientId`,
    });
  }
}
