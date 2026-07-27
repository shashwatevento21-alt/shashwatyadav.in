<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// This file lives in public_html/creators/ on the server. The actual
// Laravel application (app/, bootstrap/, vendor/, storage/, etc.) lives
// OUTSIDE the web root, in a sibling folder next to public_html — e.g.
//   /home/<user>/public_html/creators/   <- this file
//   /home/<user>/creator-platform/       <- the app itself
// Adjust the path below if you name that sibling folder something
// other than "creator-platform".
$appPath = __DIR__.'/../../creator-platform';

// This app is served from a subfolder (shashwatyadav.in/creators), not the
// domain root. Laravel/Symfony auto-detect the "base path" to strip by
// diffing SCRIPT_NAME against REQUEST_URI — and there's a long-standing,
// still-unfixed Laravel bug (laravel/framework #32082, #32236, #32832)
// where route:cache's internal request duplication corrupts that
// detection specifically for the bare subfolder root, throwing
// "MethodNotAllowedHttpException: supported methods: HEAD" for GET /.
// Every other route is unaffected (see deploy/DEPLOYMENT.md for the full
// diagnosis) — only the homepage collapses to exactly the base path.
//
// Fix: strip the subfolder prefix ourselves, here, before Laravel ever
// sees it — but ONLY for that exact bare-homepage request. Symfony's own
// base-path auto-detection already works correctly for every other route,
// and overriding it unconditionally (an earlier version of this file did)
// breaks signed-URL validation elsewhere — e.g. email verification links —
// because signature generation uses the forced root (below) while
// validation reads the request's own (would-be-stripped) URL; the two need
// to agree, so only the one route that's actually broken gets touched.
$subfolder = '/creators';
$rawRequestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = strtok($rawRequestUri, '?');

if ($path === $subfolder || $path === $subfolder.'/') {
    $queryPos = strpos($rawRequestUri, '?');
    $_SERVER['REQUEST_URI'] = '/'.($queryPos !== false ? substr($rawRequestUri, $queryPos) : '');
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
}

// AppServiceProvider::boot() separately calls URL::forceRootUrl(config('app.url'))
// so link/redirect/signed-URL generation always includes "/creators" regardless
// of which route generated it — independent of the homepage-only fix above.

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $appPath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $appPath.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once $appPath.'/bootstrap/app.php';

// Tell Laravel where the real public folder is, since it no longer
// sits directly inside the application root (base_path('public') would
// otherwise be wrong for anything that relies on public_path(), e.g.
// a manually-created storage symlink).
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
