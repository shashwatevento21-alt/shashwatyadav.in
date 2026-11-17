<?php
/** The blog index (/blog/) and the category page: hero, category chips, card grid, pager, call to action. */
if (! defined('ABSPATH')) {
    exit;
}

// Everything runs inside a function so the variables below can never overwrite WordPress's globals ($more, $pages, $id...).
(function () {
$perPage = 12;
if (is_category()) {
    $q = $GLOBALS['wp_query'];
    $current = max(1, (int) get_query_var('paged'));
    $pageUrl = fn (int $n): string => get_pagenum_link($n);
    $catName = single_cat_title('', false);
    $h1 = $catName;
    $lead = 'Every guide filed under '.$catName.'.';
    $eyebrow = 'Blog category';
} else {
    $current = max(1, (int) get_query_var('page'), (int) get_query_var('paged'));
    $q = new WP_Query([
        'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => $perPage, 'paged' => $current,
        'ignore_sticky_posts' => true, 'orderby' => 'date', 'order' => 'DESC',
    ]);
    $base = trailingslashit(get_permalink(get_queried_object_id()));
    $pageUrl = fn (int $n): string => $n <= 1 ? $base : $base.$n.'/';
    $h1 = 'Marketing guides for businesses in Raipur';
    $lead = 'Straightforward guides on digital marketing, performance marketing and SEO, to help you choose the right partner and grow with confidence.';
    $eyebrow = 'Blog';
}
$pages = max(1, (int) $q->max_num_pages);
$cats = array_values(array_filter(get_categories(['hide_empty' => true]), fn ($c) => $c->count > 0));

include __DIR__.'/_head.php';
?>
<main id="main" class="sbl-main">
  <div class="sbl-crumbbar">
    <div class="sbl-container">
      <nav class="sbl-crumbs" aria-label="Breadcrumb">
        <ol>
          <?php sbl_breadcrumb_items(); ?>
        </ol>
      </nav>
    </div>
  </div>

  <section class="sbl-hero">
    <div class="sbl-container">
      <p class="sbl-eyebrow"><span class="sbl-dot" aria-hidden="true"></span><?php echo esc_html($eyebrow); ?></p>
      <h1><?php echo esc_html($h1); ?></h1>
      <p class="sbl-lead"><?php echo esc_html($lead); ?></p>
    </div>
  </section>

  <section class="sbl-section">
    <div class="sbl-container">
      <?php if (count($cats) > 1) : ?>
        <nav class="sbl-cats" aria-label="Blog categories">
          <a href="/blog/"<?php echo is_category() ? '' : ' aria-current="page"'; ?>>All</a>
          <?php foreach ($cats as $c) : ?>
            <a href="<?php echo esc_url(get_category_link($c)); ?>"<?php echo (is_category() && get_queried_object_id() === $c->term_id) ? ' aria-current="page"' : ''; ?>><?php echo esc_html($c->name); ?> <span><?php echo (int) $c->count; ?></span></a>
          <?php endforeach; ?>
        </nav>
      <?php endif; ?>

      <?php if ($q->have_posts()) : ?>
        <div class="sbl-grid">
          <?php
          $i = 0;
          while ($q->have_posts()) :
              $q->the_post();
              $id = get_the_ID();
              $cat = get_the_category($id)[0] ?? null;
              $img = get_the_post_thumbnail($id, 'large', ['class' => 'sbl-card__img', 'alt' => '', 'loading' => $i < 3 ? 'eager' : 'lazy', 'decoding' => 'async']);
              ?>
            <article class="sbl-card">
              <?php if ($img) : ?>
                <a class="sbl-card__media" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true"><?php echo $img; ?></a>
              <?php endif; ?>
              <div class="sbl-card__body">
                <?php if ($cat) : ?>
                  <a class="sbl-card__cat" href="<?php echo esc_url(get_category_link($cat)); ?>"><?php echo esc_html($cat->name); ?></a>
                <?php endif; ?>
                <h2 class="sbl-card__title"><a href="<?php the_permalink(); ?>"><?php echo esc_html(get_the_title()); ?></a></h2>
                <p class="sbl-card__excerpt"><?php echo esc_html(sbl_excerpt($id)); ?></p>
                <p class="sbl-card__meta"><time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('j F Y')); ?></time> · <?php echo (int) sbl_read_minutes($id); ?> min read</p>
              </div>
            </article>
              <?php
              $i++;
          endwhile;
          wp_reset_postdata();
          ?>
        </div>
      <?php else : ?>
        <p class="sbl-empty">No guides here yet.</p>
      <?php endif; ?>

      <?php if ($pages > 1) : ?>
        <nav class="sbl-pager" aria-label="Pagination">
          <?php if ($current > 1) : ?><a rel="prev" href="<?php echo esc_url($pageUrl($current - 1)); ?>">&larr; Newer</a><?php endif; ?>
          <span>Page <?php echo (int) $current; ?> of <?php echo (int) $pages; ?></span>
          <?php if ($current < $pages) : ?><a rel="next" href="<?php echo esc_url($pageUrl($current + 1)); ?>">Older &rarr;</a><?php endif; ?>
        </nav>
      <?php endif; ?>
    </div>
  </section>

  <?php include __DIR__.'/_cta.php'; ?>
</main>
<?php include __DIR__.'/_foot.php'; })(); ?>
