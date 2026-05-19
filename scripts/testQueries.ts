import fetch from 'node-fetch';

const url = process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';
const token = process.env.API_KEY || process.env.AUTH_TOKEN || '';

type GraphQLResponse<T> = {
    data?: T;
    errors?: Array<{ message: string }>;
};

async function graphql<T>(query: string, variables?: Record<string, unknown>) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
        throw new Error(json.errors.map((error) => error.message).join('; '));
    }

    return json.data as T;
}

async function run() {
    const now = new Date();
    const after = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const before = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const eventsQuery = `
    query TestEvents($after: DateTime!, $before: DateTime!) {
      events(after: $after, before: $before) {
        id
        title
        start
        end
        description
      }
    }
  `;

    const eventsData = await graphql<{ events: Array<{ id: string; title: string; start: string; end: string; description?: string }> }>(eventsQuery, {
        after,
        before,
    });

    console.log('events query result:');
    console.log(JSON.stringify(eventsData, null, 2));

    const firstEvent = eventsData.events[0];
    if (!firstEvent) {
        console.log('No events returned; skipping single-event query.');
        return;
    }

    const eventQuery = `
    query TestEvent($id: ID!) {
      event(id: $id) {
        id
        title
        start
        end
        description
      }
    }
  `;

    const eventData = await graphql<{ event: { id: string; title: string; start: string; end: string; description?: string } | null }>(eventQuery, {
        id: firstEvent.id,
    });

    console.log('event query result:');
    console.log(JSON.stringify(eventData, null, 2));
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
