/**
 * WorkerPool.ts
 * A utility for managing multiple web workers to process terrain data in parallel
 */

import { TerrainWorkerMessageType } from './types';

/**
 * Interface for a task that can be processed by a worker in the pool
 */
export interface WorkerTask {
  id: string;
  type: TerrainWorkerMessageType;
  data: unknown;
  transferables?: Transferable[];
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Extended worker status with message handler
 */
interface WorkerStatusWithHandler extends WorkerStatus {
  messageHandler: ((event: MessageEvent) => void) | null;
}

/**
 * Status of a worker in the pool
 */
interface WorkerStatus {
  worker: Worker;
  busy: boolean;
  currentTask: WorkerTask | null;
  lastActiveTime: number;
}

/**
 * Manages a pool of web workers to process tasks in parallel
 */
export class WorkerPool {
  private workers: WorkerStatusWithHandler[] = [];
  private taskQueue: WorkerTask[] = [];
  private maxWorkers: number;
  private workerScript: string;
  private idleTimeout: number;
  private idleCheckInterval: number | null = null;

  /**
   * Creates a new worker pool
   * @param workerScript Path to the worker script
   * @param maxWorkers Maximum number of workers to create (defaults to number of CPU cores)
   * @param idleTimeout Time in ms after which idle workers will be terminated (0 to disable)
   */
  constructor(workerScript: string, maxWorkers?: number, idleTimeout: number = 60000) {
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers || navigator.hardwareConcurrency || 4;
    this.idleTimeout = idleTimeout;

    // Start idle worker management if timeout is enabled
    if (this.idleTimeout > 0) {
      this.idleCheckInterval = window.setInterval(
        () => this.manageIdleWorkers(),
        this.idleTimeout / 2
      );
    }

    console.log(
      `Created worker pool with max ${this.maxWorkers} workers for script: ${workerScript}`
    );
  }

  /**
   * Submits a task to be processed by a worker
   * @param task The task to process
   * @returns A promise that resolves when the task is complete
   */
  public async submitTask<T>(task: Omit<WorkerTask, 'id'>): Promise<T> {
    // Create a unique ID for this task
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      const fullTask: WorkerTask = {
        ...task,
        id: taskId,
        onComplete: (result) => {
          task.onComplete?.(result);
          resolve(result as T);
        },
        onError: (error) => {
          task.onError?.(error);
          reject(error);
        },
      };

      // Add to queue
      this.taskQueue.push(fullTask);

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Process the next task in the queue if a worker is available
   */
  private processQueue(): void {
    // If no tasks, nothing to do
    if (this.taskQueue.length === 0) return;

    // Try to find an available worker
    const availableWorker = this.workers.find((w) => !w.busy);

    if (availableWorker) {
      // Get next task
      const task = this.taskQueue.shift();
      if (!task) return;

      // Assign task to worker
      this.assignTaskToWorker(availableWorker, task);
    } else if (this.workers.length < this.maxWorkers) {
      // Create a new worker if under limit
      const task = this.taskQueue.shift();
      if (!task) return;

      const worker = this.createWorker();
      const workerStatus: WorkerStatusWithHandler = {
        worker,
        busy: true,
        currentTask: task,
        lastActiveTime: Date.now(),
        messageHandler: null,
      };

      this.workers.push(workerStatus);
      this.assignTaskToWorker(workerStatus, task);
    }
    // Otherwise, task stays in queue until a worker becomes available
  }

  /**
   * Create a new worker
   */
  private createWorker(): Worker {
    const worker = new Worker(this.workerScript);
    console.log('Created new worker, total workers:', this.workers.length + 1);
    return worker;
  }

  /**
   * Assign a task to a worker
   */
  private assignTaskToWorker(workerStatus: WorkerStatusWithHandler, task: WorkerTask): void {
    // Mark as busy
    workerStatus.busy = true;
    workerStatus.currentTask = task;
    workerStatus.lastActiveTime = Date.now();

    // Set up message handler
    const messageHandler = (event: MessageEvent) => {
      if (!event.data || !event.data.type) return;

      const { type, data } = event.data;

      if (type === 'progress') {
        // Handle progress update
        task.onProgress?.(data.progress, data.message);
      } else if (type === 'error') {
        // Handle error
        console.error('Worker error:', data);

        // Create error object with details
        const error = new Error(data.message || 'Unknown worker error');
        if (data.stack) {
          error.stack = data.stack;
        }

        task.onError?.(error);

        // Reset worker
        this.resetWorker(workerStatus);
      } else if (type.includes('_done')) {
        // Task completed, notify
        task.onComplete?.(data);

        // Reset worker
        this.resetWorker(workerStatus);
      } else if (type === 'worker_busy') {
        // Worker is busy (shouldn't happen in a managed pool)
        console.warn('Worker reported busy status when it should be available:', data);

        // Force reset worker
        this.terminateWorker(workerStatus);

        // Re-queue the task
        this.taskQueue.unshift(task);
        this.processQueue();
      }
    };

    workerStatus.worker.addEventListener('message', messageHandler);

    // Keep track of the message handler to remove it later
    workerStatus.messageHandler = messageHandler;

    // Send task to worker
    if (task.transferables && task.transferables.length > 0) {
      workerStatus.worker.postMessage(
        {
          type: task.type,
          data: task.data,
        },
        task.transferables
      );
    } else {
      workerStatus.worker.postMessage({
        type: task.type,
        data: task.data,
      });
    }
  }

  /**
   * Reset a worker after task completion
   */
  private resetWorker(workerStatus: WorkerStatusWithHandler): void {
    // Remove message handler
    if (workerStatus.messageHandler) {
      workerStatus.worker.removeEventListener('message', workerStatus.messageHandler);
      workerStatus.messageHandler = null;
    }

    // Mark as available
    workerStatus.busy = false;
    workerStatus.currentTask = null;
    workerStatus.lastActiveTime = Date.now();

    // Process next task if any
    this.processQueue();
  }

  /**
   * Terminate a worker
   */
  private terminateWorker(workerStatus: WorkerStatusWithHandler): void {
    try {
      // Remove message handler if exists
      if (workerStatus.messageHandler) {
        workerStatus.worker.removeEventListener('message', workerStatus.messageHandler);
      }

      // Terminate worker
      workerStatus.worker.terminate();

      // Remove from pool
      const index = this.workers.indexOf(workerStatus);
      if (index !== -1) {
        this.workers.splice(index, 1);
      }

      console.log('Terminated worker, remaining workers:', this.workers.length);
    } catch (error) {
      console.error('Error terminating worker:', error);
    }
  }

  /**
   * Manage idle workers - terminate workers that have been idle for too long
   */
  private manageIdleWorkers(): void {
    const now = Date.now();

    // Keep at least one worker always available
    const idleWorkers = this.workers.filter((w) => !w.busy);
    const workersToKeep = Math.max(1, this.workers.length / 4); // Keep at least 25% of max workers

    let terminatedCount = 0;

    // Check each idle worker
    for (let i = 0; i < idleWorkers.length; i++) {
      const worker = idleWorkers[i];

      // Skip if this is one of the workers to keep
      if (i < workersToKeep) continue;

      // Check if idle for too long
      const idleTime = now - worker.lastActiveTime;
      if (idleTime > this.idleTimeout) {
        this.terminateWorker(worker);
        terminatedCount++;
      }
    }

    if (terminatedCount > 0) {
      console.log(`Terminated ${terminatedCount} idle workers, remaining: ${this.workers.length}`);
    }
  }

  /**
   * Get stats about the worker pool
   */
  public getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    maxWorkers: number;
  } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      queuedTasks: this.taskQueue.length,
      maxWorkers: this.maxWorkers,
    };
  }

  /**
   * Terminate all workers and clear the task queue
   */
  public terminate(): void {
    // Clear the interval if it exists
    if (this.idleCheckInterval !== null) {
      window.clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Terminate all workers
    this.workers.forEach((worker) => {
      try {
        worker.worker.terminate();
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    });

    // Clear arrays
    this.workers = [];
    this.taskQueue = [];

    console.log('Worker pool terminated');
  }
}
