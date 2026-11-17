<?php
/** Page end shared by the blog templates: the site's own footer and its script. */
if (! defined('ABSPATH')) {
    exit;
}
sbl_partial('footer');
if (sbl_new_design()) {
    $sblB = sbl_base();
    foreach (['theme.js', 'main.js'] as $sblJs) {
        $sblFile = ABSPATH.ltrim($sblB, '/').'/assets/js/'.$sblJs;
        echo '<script src="'.esc_attr($sblB.'/assets/js/'.$sblJs).(is_file($sblFile) ? '?v='.filemtime($sblFile) : '').'"'.($sblJs === 'theme.js' ? ' defer' : '').'></script>'."\n";
    }
} else {
    $mainJs = ABSPATH.'assets/js/main.js';
    ?>
<script src="/assets/js/main.js<?php echo is_file($mainJs) ? '?v='.filemtime($mainJs) : ''; ?>"></script>
    <?php
}
sbl_filtered('wp_footer'); ?>
</body>
</html>
