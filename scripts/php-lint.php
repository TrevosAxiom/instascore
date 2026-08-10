<?php
/**
 * Cross-platform PHP syntax checker.
 *
 * @package InstaScore
 */

declare(strict_types=1);

$root     = dirname(__DIR__);
$iterator = new RecursiveIteratorIterator(
	new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
);
$failed   = false;

foreach ($iterator as $file) {
	if (! $file instanceof SplFileInfo || 'php' !== $file->getExtension()) {
		continue;
	}

	$path = $file->getPathname();
	if (
		str_contains($path, DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR)
		|| str_contains($path, DIRECTORY_SEPARATOR . 'node_modules' . DIRECTORY_SEPARATOR)
	) {
		continue;
	}

	$command = escapeshellarg(PHP_BINARY) . ' -n -l ' . escapeshellarg($path);
	passthru($command, $exit_code);

	if (0 !== $exit_code) {
		$failed = true;
	}
}

exit($failed ? 1 : 0);
