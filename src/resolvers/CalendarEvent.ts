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

  description: string;

  @Field(() => String, { name: 'description' })
  getDescription() {
    return this.description || '';
  }

  location: string;

  @Field(() => String, { name: 'location' })
  getLocation() {
    return this.location || '';
  }

  @Field(() => GraphQLJSONObject)
  metadata: Record<string, unknown>

  @Field(() => Number)
  async subscriberCount(): Promise<number> {
    return (await config.prisma.subscription.findMany({
      where: { calendarId: this.calendarId, eventId: this.id },
      select: { eventId: true },
    })).length;
  }
}

export type ICalendarEvent = CalendarEvent
