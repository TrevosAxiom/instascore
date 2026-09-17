<?php

use InstaScore\Platform\Database\Version0018;
use InstaScore\Platform\Domain\ValidationException;
use InstaScore\Platform\Repositories\MatchChatRepository;
use InstaScore\Platform\Services\MatchChatService;
use PHPUnit\Framework\TestCase;

final class MatchChatTest extends TestCase {
	public function test_chat_schema_declares_messages_reactions_reports_and_bans(): void {
		$schema = implode( "\n", ( new Version0018( new wpdb() ) )->schemas() );

		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_chat_messages', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_chat_reactions', $schema );
		$this->assertStringContainsString( 'UNIQUE KEY message_user_reaction', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_chat_reports', $schema );
		$this->assertStringContainsString( 'UNIQUE KEY message_reporter', $schema );
		$this->assertStringContainsString( 'CREATE TABLE wp_instascore_chat_bans', $schema );
		$this->assertStringContainsString( 'KEY user_status_expiry', $schema );
	}

	public function test_empty_messages_are_rejected(): void {
		$service = new MatchChatService( new MatchChatRepository( new wpdb() ) );

		$this->expectException( ValidationException::class );
		$service->post( '00000000-0000-4000-8000-000000000501', array( 'body' => '   ' ), 7 );
	}

	public function test_unapproved_reactions_are_rejected(): void {
		$service = new MatchChatService( new MatchChatRepository( new wpdb() ) );

		$this->expectException( ValidationException::class );
		$service->react( '00000000-0000-4000-8000-000000000502', '👎', 7 );
	}
}
