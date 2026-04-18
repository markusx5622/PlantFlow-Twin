// ─── EventQueue Tests ───
import { describe, it, expect } from 'vitest';
import { EventQueue } from '../../src/engine/event-queue.js';
import { EventType, EVENT_PRIORITY, SimEvent } from '../../src/engine/types.js';

function makeEvent(
  time: number,
  type: EventType,
  stationIndex = -1,
  version = 0,
): SimEvent {
  return { time, type, priority: EVENT_PRIORITY[type], stationIndex, version };
}

describe('EventQueue', () => {
  it('pops events in time order', () => {
    const q = new EventQueue();
    q.push(makeEvent(10, EventType.PROCESS_END));
    q.push(makeEvent(5, EventType.PROCESS_END));
    q.push(makeEvent(15, EventType.PROCESS_END));
    q.push(makeEvent(1, EventType.PROCESS_END));

    expect(q.pop()!.time).toBe(1);
    expect(q.pop()!.time).toBe(5);
    expect(q.pop()!.time).toBe(10);
    expect(q.pop()!.time).toBe(15);
  });

  it('breaks ties by priority (lower priority number = fires first)', () => {
    const q = new EventQueue();
    q.push(makeEvent(10, EventType.TRY_ACTIVATE));      // priority 4
    q.push(makeEvent(10, EventType.PROCESS_END));        // priority 3
    q.push(makeEvent(10, EventType.SIMULATION_END));     // priority 0
    q.push(makeEvent(10, EventType.BREAK_START));        // priority 1
    q.push(makeEvent(10, EventType.BREAK_END));          // priority 2

    const order = [];
    while (!q.isEmpty()) {
      order.push(q.pop()!.type);
    }

    expect(order).toEqual([
      EventType.SIMULATION_END,
      EventType.BREAK_START,
      EventType.BREAK_END,
      EventType.PROCESS_END,
      EventType.TRY_ACTIVATE,
    ]);
  });

  it('handles mixed times and priorities', () => {
    const q = new EventQueue();
    q.push(makeEvent(5, EventType.TRY_ACTIVATE));
    q.push(makeEvent(5, EventType.PROCESS_END));
    q.push(makeEvent(3, EventType.TRY_ACTIVATE));
    q.push(makeEvent(3, EventType.SIMULATION_END));

    expect(q.pop()!).toMatchObject({ time: 3, type: EventType.SIMULATION_END });
    expect(q.pop()!).toMatchObject({ time: 3, type: EventType.TRY_ACTIVATE });
    expect(q.pop()!).toMatchObject({ time: 5, type: EventType.PROCESS_END });
    expect(q.pop()!).toMatchObject({ time: 5, type: EventType.TRY_ACTIVATE });
  });

  it('returns undefined when empty', () => {
    const q = new EventQueue();
    expect(q.pop()).toBeUndefined();
    expect(q.peek()).toBeUndefined();
  });

  it('reports correct length', () => {
    const q = new EventQueue();
    expect(q.length).toBe(0);
    expect(q.isEmpty()).toBe(true);

    q.push(makeEvent(1, EventType.PROCESS_END));
    expect(q.length).toBe(1);
    expect(q.isEmpty()).toBe(false);

    q.pop();
    expect(q.length).toBe(0);
    expect(q.isEmpty()).toBe(true);
  });

  it('handles large number of events correctly', () => {
    const q = new EventQueue();
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const t = Math.random() * 10000;
      times.push(t);
      q.push(makeEvent(t, EventType.PROCESS_END));
    }

    times.sort((a, b) => a - b);
    for (let i = 0; i < 1000; i++) {
      expect(q.pop()!.time).toBeCloseTo(times[i], 10);
    }
  });

  it('toSortedArray returns all events sorted', () => {
    const q = new EventQueue();
    q.push(makeEvent(10, EventType.PROCESS_END));
    q.push(makeEvent(5, EventType.TRY_ACTIVATE));
    q.push(makeEvent(5, EventType.PROCESS_END));

    const sorted = q.toSortedArray();
    expect(sorted.length).toBe(3);
    expect(sorted[0].time).toBe(5);
    expect(sorted[0].type).toBe(EventType.PROCESS_END);
    expect(sorted[1].time).toBe(5);
    expect(sorted[1].type).toBe(EventType.TRY_ACTIVATE);
    expect(sorted[2].time).toBe(10);
  });
});
