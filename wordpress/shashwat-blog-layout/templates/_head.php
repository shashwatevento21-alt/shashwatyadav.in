<?php
/** Page start shared by the blog templates: the same head assets as the static pages, then the site's own header. */
if (! defined('ABSPATH')) {
    exit;
}
$sblAsset = function (string $path): string {
    $file = ABSPATH.ltrim($path, '/');

    return $path.(is_file($file) ? '?v='.filemtime($file) : '');
};
$sblNew = sbl_new_design();
$sblB = sbl_base();
// the new design's files: in the private preview they live under /_preview/, after go-live at the site root
$sblNewAsset = function (string $path) use ($sblB): string {
    $file = ABSPATH.ltrim($sblB.$path, '/');

    return $sblB.$path.(is_file($file) ? '?v='.filemtime($file) : '');
};
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php if ($sblNew && sbl_new_is_private()) : ?>
  <meta name="robots" content="noindex, nofollow">
<?php endif; ?>
  <link rel="icon" type="image/png" href="<?php echo esc_attr($sblNew ? $sblB.'/assets/images/favicon.png' : '/assets/images/favicon.png'); ?>">
<?php if ($sblNew) : ?>

  <link rel="preload" href="<?php echo esc_attr($sblB); ?>/assets/fonts/inter-latin-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="<?php echo esc_attr($sblB); ?>/assets/fonts/inter-latin-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="<?php echo esc_attr($sblB); ?>/assets/fonts/montserrat-latin-800.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="<?php echo esc_attr($sblB); ?>/assets/fonts/montserrat-latin-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="<?php echo esc_attr($sblNewAsset('/assets/css/theme.css')); ?>">
<?php else : ?>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="<?php echo esc_attr($sblAsset('/assets/js/tailwind-config.js')); ?>"></script>
  <link rel="stylesheet" href="<?php echo esc_attr($sblAsset('/assets/css/style.css')); ?>">
<?php endif; ?>
  <?php sbl_filtered('wp_head'); ?>
</head>
<body <?php body_class($sblNew ? 'sbl sbl-v2' : 'bg-background text-text-body overflow-x-hidden sbl'); ?>>
<?php
// Google Tag Manager (noscript): right after <body>, same container as the static pages
echo '<!-- Google Tag Manager (noscript) -->' . "
" . '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5SRRSFV6" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' . "
" . '<!-- End Google Tag Manager (noscript) -->' . "
";
if (function_exists('wp_body_open')) {
    wp_body_open();
}
sbl_partial('header');
