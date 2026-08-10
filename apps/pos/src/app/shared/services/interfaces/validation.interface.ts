/**
 * Validation State Interface
 * 
 * Represents the validation state of a form control or input component.
 * Used for exposing validation state to parent components and NGXS Forms integration.
 */
export interface ValidationState {
  /**
   * Whether the control is valid
   */
  isValid: boolean;

  /**
   * Whether the control is invalid
   */
  isInvalid: boolean;

  /**
   * Whether the control has been modified
   */
  isDirty: boolean;

  /**
   * Whether the control has been touched (focused and blurred)
   */
  isTouched: boolean;

  /**
   * Whether the control is pending (async validation in progress)
   */
  isPending: boolean;

  /**
   * Validation errors object (key-value pairs of error keys and their values)
   */
  errors: { [key: string]: any } | null;

  /**
   * Human-readable error message
   */
  errorMessage: string | null;
}

