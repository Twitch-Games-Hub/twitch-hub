/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			user?: import('@twitch-hub/shared-types').ApiUser;
		}
	}
}

export {};
