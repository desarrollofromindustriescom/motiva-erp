import { FieldTree, SchemaPathTree } from '@angular/forms/signals';

export type SignalForm<T> = FieldTree<T, string | number, 'writable'>;
export type FormSchema<T> = SchemaPathTree<T, any>;
