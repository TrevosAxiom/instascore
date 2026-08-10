<?php
/**
 * Domain validation error.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Domain;

use InvalidArgumentException;

final class ValidationException extends InvalidArgumentException {
	/**
	 * @param array<string,string> $errors Field errors.
	 */
	public function __construct( private readonly array $errors ) {
		parent::__construct( 'The submitted competition data is invalid.' );
	}

	/**
	 * @return array<string,string>
	 */
	public function errors(): array {
		return $this->errors;
	}
}
