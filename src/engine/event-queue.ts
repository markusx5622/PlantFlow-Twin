// ─── PlantFlow Twin — Event Queue (min-heap) ───
// Orders by time ASC, then by priority ASC (lower = higher urgency).

import { SimEvent } from './types';

export class EventQueue {
  private heap: SimEvent[] = [];

  get length(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** Push an event into the queue. O(log n). */
  push(event: SimEvent): void {
    this.heap.push(event);
    this.siftUp(this.heap.length - 1);
  }

  /** Pop the highest-priority (earliest time) event. O(log n). */
  pop(): SimEvent | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  /** Peek at the next event without removing it. */
  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  /** Remove all events. */
  clear(): void {
    this.heap = [];
  }

  /** Return a sorted copy of all events (for testing / debug). */
  toSortedArray(): SimEvent[] {
    return [...this.heap].sort((a, b) => this.compare(a, b));
  }

  // ── Heap internals ──

  private compare(a: SimEvent, b: SimEvent): number {
    if (a.time !== b.time) return a.time - b.time;
    return a.priority - b.priority;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i], this.heap[parent]) < 0) {
        this.swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== i) {
        this.swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }
}
