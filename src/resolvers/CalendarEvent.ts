import { ObjectType, Field, ID } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import config from '../config';

@ObjectType()
export class CalendarEvent {
  @Field(() => String)
  calendarId: string;

  @Field(() => String)
  calendarName: string;

  @Field(() => ID)
  id: string;

  @Field(() => Date)
  start: Date;

  @Field(() => Date)
  end: Date;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  location: string;

  @Field(() => GraphQLJSONObject)
  metadata: Record<string, unknown>

  @Field(() => Number)
  async subscriberCount(): Promise<number> {
    return config.prisma.subscription.count({
      where: { calendarId: this.calendarId, eventId: this.id },
    });
  }
}

export type ICalendarEvent = CalendarEvent
