import { ulid } from 'ulid';

export interface PushSubscriptionProps {
  pushId: string;
  customerId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
}

export class PushSubscription {
  private constructor(private readonly props: PushSubscriptionProps) {}

  get pushId(): string {
    return this.props.pushId;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get endpoint(): string {
    return this.props.endpoint;
  }

  get p256dhKey(): string {
    return this.props.p256dhKey;
  }

  get authKey(): string {
    return this.props.authKey;
  }

  get platform(): 'ios' | 'android' | 'web' {
    return this.props.platform;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  toJSON(): PushSubscriptionProps {
    return { ...this.props };
  }

  static create(
    customerId: string,
    props: Omit<PushSubscriptionProps, 'pushId' | 'createdAt' | 'customerId'>,
  ): PushSubscription {
    return new PushSubscription({
      pushId: ulid(),
      createdAt: new Date().toISOString(),
      customerId,
      ...props,
    });
  }

  static reconstitute(props: PushSubscriptionProps): PushSubscription {
    return new PushSubscription(props);
  }
}
