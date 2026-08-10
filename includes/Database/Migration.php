<?php
/**
 * Migration contract.
 *
 * @package InstaScore_Platform
 */

namespace InstaScore\Platform\Database;

interface Migration {
	public function version(): int;

	public function name(): string;

	public function checksum(): string;

	public function up(): void;
}
