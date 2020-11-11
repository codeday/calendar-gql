import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class CalendarEvent {
  @Field(() => String)
  calendarId: string;

  @Field(() => String)
  calendarName: string;

  @Field(() => String)
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
}

export type ICalendarEvent = CalendarEvent
