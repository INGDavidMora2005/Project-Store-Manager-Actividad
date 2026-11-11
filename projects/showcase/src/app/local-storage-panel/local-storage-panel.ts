import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { LocalStorageService, StorageError, StorageErrorCode } from 'ngx-uceva-storage-manager';

type ValueType = 'string' | 'number' | 'boolean' | 'json';
type UpdateOperation = 'increment' | 'toggle' | 'replace';

interface Feedback {
  kind: 'success' | 'error';
  message: string;
  code?: StorageErrorCode;
  cause?: string;
}

interface QueryResult {
  key: string;
  value: string | null;
}

interface StorageEntry {
  key: string;
  value: string;
}

type ParsedValue = { value: unknown } | { error: string };

@Component({
  imports: [],
  selector: 'app-local-storage-panel',
  styleUrl: './local-storage-panel.scss',
  templateUrl: './local-storage-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalStoragePanel {
  protected readonly localStorageService = inject(LocalStorageService);

  protected readonly saveKey = signal('');
  protected readonly saveValue = signal('');
  protected readonly saveType = signal<ValueType>('string');

  protected readonly queryKey = signal('');
  protected readonly queryResult = signal<QueryResult | null>(null);

  protected readonly updateKey = signal('');
  protected readonly updateOperation = signal<UpdateOperation>('increment');
  protected readonly updateType = signal<ValueType>('string');
  protected readonly updateValue = signal('');
  protected readonly updateResult = signal<string | null>(null);

  protected readonly removeKey = signal('');
  protected readonly removeExists = signal<boolean | null>(null);

  protected readonly entries = signal<StorageEntry[]>([]);

  protected readonly confirmingClear = signal(false);
  protected readonly feedback = signal<Feedback | null>(null);

  constructor() {
    try {
      this.refreshEntries();
    } catch (error) {
      this.showError(error);
    }
  }

  protected setFromInput(target: WritableSignal<string>, event: Event): void {
    target.set(this.inputValue(event));
  }

  protected onSaveTypeChange(event: Event): void {
    const type = this.inputValue(event) as ValueType;
    this.saveType.set(type);

    if (type === 'boolean' && this.saveValue() !== 'true' && this.saveValue() !== 'false') {
      this.saveValue.set('true');
    }
  }

  protected onUpdateOperationChange(event: Event): void {
    this.updateOperation.set(this.inputValue(event) as UpdateOperation);
  }

  protected onUpdateTypeChange(event: Event): void {
    const type = this.inputValue(event) as ValueType;
    this.updateType.set(type);

    if (type === 'boolean' && this.updateValue() !== 'true' && this.updateValue() !== 'false') {
      this.updateValue.set('true');
    }
  }

  protected save(): void {
    const key = this.saveKey().trim();

    if (!key) {
      this.showInputError('La clave es obligatoria.');
      return;
    }

    const parsed = this.parseValue(this.saveType(), this.saveValue());

    if ('error' in parsed) {
      this.showInputError(parsed.error);
      return;
    }

    this.mutate(() => {
      this.localStorageService.set(key, parsed.value);
      return `Se guardó la clave "${key}".`;
    });
  }

  protected query(): void {
    const key = this.queryKey().trim();

    if (!key) {
      this.showInputError('Escribe una clave para consultar.');
      return;
    }

    try {
      const value = this.localStorageService.get<unknown>(key);

      this.queryResult.set({
        key,
        value: value === null ? null : this.formatValue(value),
      });
      this.showSuccess(
        value === null ? `La clave "${key}" no existe.` : `Se consultó la clave "${key}".`,
      );
    } catch (error) {
      this.queryResult.set(null);
      this.showError(error);
    }
  }

  protected update(): void {
    const key = this.updateKey().trim();

    if (!key) {
      this.showInputError('Escribe una clave para actualizar.');
      return;
    }

    let replacement: unknown;

    if (this.updateOperation() === 'replace') {
      const parsed = this.parseValue(this.updateType(), this.updateValue());

      if ('error' in parsed) {
        this.showInputError(parsed.error);
        return;
      }

      replacement = parsed.value;
    }

    this.updateResult.set(null);

    this.mutate(() => {
      const value = this.applyUpdate(key, replacement);

      this.updateResult.set(this.formatValue(value));
      return `Se actualizó la clave "${key}".`;
    });
  }

  protected checkExists(): void {
    const key = this.removeKey().trim();

    if (!key) {
      this.showInputError('Escribe una clave para comprobar si existe.');
      return;
    }

    try {
      const exists = this.localStorageService.has(key);

      this.removeExists.set(exists);
      this.showSuccess(`La clave "${key}" ${exists ? 'existe' : 'no existe'}.`);
    } catch (error) {
      this.removeExists.set(null);
      this.showError(error);
    }
  }

  protected remove(): void {
    const key = this.removeKey().trim();

    if (!key) {
      this.showInputError('Escribe una clave para eliminar.');
      return;
    }

    this.mutate(() => {
      this.localStorageService.remove(key);
      this.removeExists.set(null);
      return `Se eliminó la clave "${key}".`;
    });
  }

  protected refreshList(): void {
    try {
      this.refreshEntries();
      const count = this.entries().length;

      this.showSuccess(
        count === 0
          ? 'No hay claves guardadas en LocalStorage.'
          : `Se listaron ${count} clave${count === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      this.showError(error);
    }
  }

  protected requestClear(): void {
    this.confirmingClear.set(true);
  }

  protected cancelClear(): void {
    this.confirmingClear.set(false);
  }

  protected confirmClear(): void {
    this.confirmingClear.set(false);

    this.mutate(() => {
      this.localStorageService.clear();
      this.queryResult.set(null);
      this.updateResult.set(null);
      this.removeExists.set(null);
      return 'Se limpiaron todas las claves de LocalStorage.';
    });
  }

  private applyUpdate(key: string, replacement: unknown): unknown {
    switch (this.updateOperation()) {
      case 'increment':
        return this.localStorageService.update<number>(
          key,
          (current) => (typeof current === 'number' ? current : 0) + 1,
        );
      case 'toggle':
        return this.localStorageService.update<boolean>(key, (current) => !current);
      case 'replace':
        return this.localStorageService.update<unknown>(key, () => replacement);
    }
  }

  private mutate(action: () => string): void {
    try {
      const message = action();

      this.refreshEntries();
      this.showSuccess(message);
    } catch (error) {
      this.showError(error);
    }
  }

  private refreshEntries(): void {
    this.entries.set(
      this.localStorageService.keys().map((key) => ({
        key,
        value: this.formatValue(this.localStorageService.get<unknown>(key)),
      })),
    );
  }

  private parseValue(type: ValueType, raw: string): ParsedValue {
    switch (type) {
      case 'string':
        return { value: raw };
      case 'number': {
        const trimmed = raw.trim();
        const value = Number(trimmed);

        return trimmed === '' || Number.isNaN(value)
          ? { error: 'El valor numérico no es válido.' }
          : { value };
      }
      case 'boolean':
        return { value: raw === 'true' };
      case 'json':
        try {
          return { value: JSON.parse(raw) as unknown };
        } catch {
          return { error: 'El JSON ingresado no es válido.' };
        }
    }
  }

  private inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  private formatValue(value: unknown): string {
    return JSON.stringify(value, null, 2) ?? String(value);
  }

  private showSuccess(message: string): void {
    this.feedback.set({ kind: 'success', message });
  }

  private showInputError(message: string): void {
    this.feedback.set({ kind: 'error', message });
  }

  private showError(error: unknown): void {
    if (error instanceof StorageError) {
      this.feedback.set({
        kind: 'error',
        message: error.message,
        code: error.code,
        cause: error.cause === undefined ? undefined : this.describeCause(error.cause),
      });
      return;
    }

    this.feedback.set({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return `${cause.name}: ${cause.message}`;
    }

    if (typeof cause === 'string') {
      return cause;
    }

    try {
      return JSON.stringify(cause) ?? String(cause);
    } catch {
      return String(cause);
    }
  }
}
