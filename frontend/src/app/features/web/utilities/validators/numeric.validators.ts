import { max, min, required, SchemaPath, validate } from '@angular/forms/signals';
import { Signal } from '@angular/core';
import { FORMS_CUSTOM_VALIDATIONS, FORMS_I18N_KEYS } from '../../../data/repository/forms.repository';

type NumberField = number | null;
type NumberPath = SchemaPath<NumberField, any, any>;

interface NumericContext {
   value: Signal<NumberField>;
   state: { touched: Signal<boolean> };
}

export const PERCENTAGE_RANGE = { min: 0.1, max: 1000, decimals: 3 };
export const MONETARY_RANGE = { min: 0.1, max: 100000, decimals: 2 };
export const WEEKS_RANGE = { min: 1, max: 100000 };

const touched = ({ state }: NumericContext): boolean => state.touched();

/**
 * Required, range & max decimals for a number field
 * (errors are shown once the field is touched)
 */
function numericRules(path: NumberPath, range: { min: number; max: number; decimals: number }): void {
   required(path, { when: touched, message: FORMS_I18N_KEYS.VAL_REQUIRED });
   min(path, range.min, { when: touched, message: FORMS_I18N_KEYS.VAL_MIN_VALUE });
   max(path, range.max, { when: touched, message: FORMS_I18N_KEYS.VAL_MAX_VALUE });

   validate(path, ({ value, state }: NumericContext) => {
      const current: NumberField = value();

      if (!state.touched() || current === null) return null;

      const scaled: number = current * Math.pow(10, range.decimals);

      if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return null;

      return {
         kind: FORMS_CUSTOM_VALIDATIONS.DECIMALS,
         decimals: range.decimals,
         message: FORMS_I18N_KEYS.VAL_DECIMALS,
      };
   });
}

export function percentageRules(path: NumberPath): void {
   numericRules(path, PERCENTAGE_RANGE);
}

/**
 * Percentage of its share of every payment that an investor receives: 100% at most
 */
export function investorPercentageRules(path: NumberPath): void {
   numericRules(path, { ...PERCENTAGE_RANGE, max: 100 });
}

export function monetaryRules(path: NumberPath): void {
   numericRules(path, MONETARY_RANGE);
}

/**
 * Required, range & integer value for weeks fields
 */
export function weeksRules(path: NumberPath): void {
   required(path, { when: touched, message: FORMS_I18N_KEYS.VAL_REQUIRED });
   min(path, WEEKS_RANGE.min, { when: touched, message: FORMS_I18N_KEYS.VAL_MIN_VALUE });
   max(path, WEEKS_RANGE.max, { when: touched, message: FORMS_I18N_KEYS.VAL_MAX_VALUE });

   validate(path, ({ value, state }: NumericContext) => {
      const current: NumberField = value();

      if (!state.touched() || current === null || Number.isInteger(current)) return null;

      return { kind: FORMS_CUSTOM_VALIDATIONS.INTEGER, message: FORMS_I18N_KEYS.VAL_INTEGER };
   });
}
