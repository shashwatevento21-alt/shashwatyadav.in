<?php
/** Page end shared by the blog templates: the site's own footer and its script. */
if (! defined('ABSPATH')) {
    exit;
}
sbl_partial('footer');
$mainJs = ABSPATH.'assets/js/main.js';
?>
<script src="/assets/js/main.js<?php echo is_file($mainJs) ? '?v='.filemtime($mainJs) : ''; ?>"></script>
<?php sbl_filtered('wp_footer'); ?>
</body>
</html>
