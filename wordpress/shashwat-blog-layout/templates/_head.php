<?php
/** Page start shared by the blog templates: the same head assets as the static pages, then the site's own header. */
if (! defined('ABSPATH')) {
    exit;
}
$sblAsset = function (string $path): string {
    $file = ABSPATH.ltrim($path, '/');

    return $path.(is_file($file) ? '?v='.filemtime($file) : '');
};
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="/assets/images/favicon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="<?php echo esc_attr($sblAsset('/assets/js/tailwind-config.js')); ?>"></script>
  <link rel="stylesheet" href="<?php echo esc_attr($sblAsset('/assets/css/style.css')); ?>">
  <?php sbl_filtered('wp_head'); ?>
</head>
<body <?php body_class('bg-background text-text-body overflow-x-hidden sbl'); ?>>
<?php
if (function_exists('wp_body_open')) {
    wp_body_open();
}
sbl_partial('header');
