<?php
/**
 * Plugin Name: Shashwat Blog Layout
 * Description: Gives the blog page (/blog/), the blog posts and the blog category page the same header and footer as the rest of shashwatyadav.com, with a card-style blog index. Leaves every other page (Divi, Elementor, /seo/) untouched. Off by default: visible only with the secret preview link until the option shashwat_blog_layout_live is 1.
 * Version: 1.1.0 (adds the new design: private preview with ?sbpreview=<token>&sbnew=1, public once the option shashwat_blog_layout_design is 'new')
 */

if (! defined('ABSPATH')) {
    exit;
}

define('SBL_DIR', plugin_dir_path(__FILE__));
define('SBL_URL', plugin_dir_url(__FILE__));

/** On for everyone once the option is 1; before that only for a request carrying the secret preview token. */
function sbl_is_preview(): bool
{
    $token = (string) get_option('shashwat_blog_layout_token', '');

    return $token !== '' && isset($_GET['sbpreview']) && hash_equals($token, (string) $_GET['sbpreview']);
}

/**
 * The NEW design (the redesigned site: shared theme, new header and footer). Off for visitors until the option shashwat_blog_layout_design is 'new'.
 * Before that it shows only on a request that carries the secret preview token AND sbnew=1 (the private preview at /_preview/).
 */
function sbl_new_design(): bool
{
    if (sbl_is_preview() && isset($_GET['sbold'])) {
        return false; // private comparison view: the previous (old) design, whatever the option says
    }

    return get_option('shashwat_blog_layout_design') === 'new' || (sbl_is_preview() && isset($_GET['sbnew']));
}

/** Where the new design's assets live: the private preview folder until go-live, the site root after. */
function sbl_base(): string
{
    return get_option('shashwat_blog_layout_design') === 'new' ? '' : '/_preview';
}

/** True while the new design is only a private preview (so the page must never be cached or indexed). */
function sbl_new_is_private(): bool
{
    return sbl_new_design() && get_option('shashwat_blog_layout_design') !== 'new';
}

function sbl_active(): bool
{
    return get_option('shashwat_blog_layout_live') === '1' || sbl_is_preview();
}

// Preview only (secret token present): a fatal error is written into the page source so it can be diagnosed.
add_action('init', function () {
    if (! sbl_is_preview()) {
        return;
    }
    register_shutdown_function(function () {
        $e = error_get_last();
        if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR], true)) {
            echo "\n<!-- SBL-FATAL: ".str_replace('--', '- -', $e['message']).' in '.basename($e['file']).':'.$e['line']." -->\n";
        }
    });
});

/** Which of our templates applies to this request (null = leave the site's own template alone). */
function sbl_template_for_request(): ?string
{
    if (is_page('blog')) {
        return 'blog.php';
    }
    if (is_category()) {
        return 'blog.php';
    }
    if (is_singular('post')) {
        return 'single.php';
    }

    return null;
}

add_filter('template_include', function ($template) {
    if (! sbl_active()) {
        return $template;
    }
    $own = sbl_template_for_request();
    if ($own === null) {
        return $template;
    }
    if (sbl_new_is_private() || (sbl_is_preview() && get_option('shashwat_blog_layout_live') !== '1')) {
        // a preview must never be cached or indexed
        nocache_headers();
        header('X-Robots-Tag: noindex, nofollow');
        do_action('litespeed_control_set_nocache', 'shashwat blog layout preview');
    }

    return SBL_DIR.'templates/'.$own;
}, 99);

/** Reading time in whole minutes (200 words a minute), at least 1. */
function sbl_read_minutes(int $postId): int
{
    $text = wp_strip_all_tags(strip_shortcodes((string) get_post_field('post_content', $postId)));

    return max(1, (int) ceil(str_word_count($text) / 200));
}

/** The card text: the SEO description when there is one, else the first words of the post. */
function sbl_excerpt(int $postId): string
{
    $desc = trim((string) get_post_meta($postId, 'rank_math_description', true));
    if ($desc !== '') {
        return $desc;
    }
    $text = wp_strip_all_tags(strip_shortcodes((string) get_post_field('post_content', $postId)));

    return wp_trim_words($text, 28);
}

/** Runs a template part (header.html/footer.html) that was generated from the static site. */
function sbl_partial(string $name): void
{
    if (sbl_new_design()) {
        echo str_replace('{{BASE}}', sbl_base(), (string) file_get_contents(SBL_DIR.'partials-v2/'.$name.'.html'));

        return;
    }
    readfile(SBL_DIR.'partials/'.$name.'.html');
}

/** Prints wp_head()/wp_footer() without the Divi theme's own styles and scripts (this layout does not use them). */
function sbl_filtered(callable $print): void
{
    ob_start();
    $print();
    $html = ob_get_clean();
    $html = preg_replace('#<style[^>]*\sid=["\'](?:et-|et_|divi|dsm-)[^>]*>.*?</style>#is', '', $html);
    $html = preg_replace('#<link[^>]*\sid=["\'](?:et-|et_|divi|dsm-)[^>]*>#i', '', $html);
    $html = preg_replace('#<link[^>]*/themes/Divi/[^>]*>#i', '', $html);
    $html = preg_replace('#<script[^>]*/themes/Divi/[^>]*>\s*</script>#is', '', $html);
    $html = preg_replace('#<script[^>]*\sid=["\'](?:et-|et_|divi)[^>]*>.*?</script>#is', '', $html);
    // Divi's inline loader for its "late" stylesheet (it looks for the Divi style tag removed above)
    $html = preg_replace('#<script\b[^>]*>(?:(?!</script>).)*(?:et-cache|et-divi-dynamic|divi-style-inline)(?:(?!</script>).)*</script>#is', '', $html);
    echo $html;
}

add_action('wp_enqueue_scripts', function () {
    if (! sbl_active() || sbl_template_for_request() === null) {
        return;
    }
    // everything registered by the Divi theme is dropped from these pages
    global $wp_styles, $wp_scripts;
    foreach ((array) $wp_styles->registered as $handle => $obj) {
        if (is_string($obj->src) && strpos($obj->src, '/themes/Divi/') !== false) {
            wp_dequeue_style($handle);
        }
    }
    foreach ((array) $wp_scripts->registered as $handle => $obj) {
        if (is_string($obj->src) && strpos($obj->src, '/themes/Divi/') !== false) {
            wp_dequeue_script($handle);
        }
    }
    if (sbl_new_design()) {
        wp_enqueue_style('sbl-blog-v2', SBL_URL.'assets/blog-v2.css', [], (string) filemtime(SBL_DIR.'assets/blog-v2.css'));

        return;
    }
    wp_enqueue_style('sbl-blog', SBL_URL.'assets/blog.css', [], (string) filemtime(SBL_DIR.'assets/blog.css'));
}, 9999);

register_activation_hook(__FILE__, function () {
    if (get_option('shashwat_blog_layout_token', '') === '') {
        add_option('shashwat_blog_layout_token', wp_generate_password(24, false, false), '', 'no');
    }
    add_option('shashwat_blog_layout_live', '0', '', 'yes');
    add_option('shashwat_blog_layout_design', 'old', '', 'yes');
});
