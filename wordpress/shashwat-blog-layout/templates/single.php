<?php
/** A blog post: breadcrumb, title block, featured image, the post body exactly as written, call to action, more guides. */
if (! defined('ABSPATH')) {
    exit;
}

// Everything runs inside a function so the variables below can never overwrite WordPress's globals ($more, $pages, $id...).
(function () {
the_post();
$id = get_the_ID();
$cat = get_the_category($id)[0] ?? null;
$more = new WP_Query([
    'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 3, 'post__not_in' => [$id],
    'ignore_sticky_posts' => true, 'orderby' => 'date', 'order' => 'DESC',
]);

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

  <article class="sbl-post">
    <header class="sbl-posthead">
      <div class="sbl-container sbl-container--narrow">
        <?php if ($cat) : ?>
          <a class="sbl-card__cat" href="<?php echo esc_url(get_category_link($cat)); ?>"><?php echo esc_html($cat->name); ?></a>
        <?php endif; ?>
        <h1><?php echo esc_html(get_the_title()); ?></h1>
        <p class="sbl-card__meta"><time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('j F Y')); ?></time> · <?php echo (int) sbl_read_minutes($id); ?> min read</p>
      </div>
    </header>

    <?php if (has_post_thumbnail()) : ?>
      <div class="sbl-container sbl-container--wide">
        <figure class="sbl-feature"><?php echo get_the_post_thumbnail($id, 'large', ['class' => 'sbl-feature__img', 'loading' => 'eager', 'decoding' => 'async', 'fetchpriority' => 'high']); ?></figure>
      </div>
    <?php endif; ?>

    <div class="sbl-container sbl-container--narrow">
      <div class="sbl-prose entry-content">
        <?php the_content(); ?>
      </div>
    </div>
  </article>

  <?php include __DIR__.'/_cta.php'; ?>

  <?php if ($more->have_posts()) : ?>
    <section class="sbl-section sbl-more">
      <div class="sbl-container">
        <h2 class="sbl-more__title">More guides</h2>
        <div class="sbl-grid">
          <?php
          while ($more->have_posts()) :
              $more->the_post();
              $mid = get_the_ID();
              $mcat = get_the_category($mid)[0] ?? null;
              $img = get_the_post_thumbnail($mid, 'large', ['class' => 'sbl-card__img', 'alt' => '', 'loading' => 'lazy', 'decoding' => 'async']);
              ?>
            <article class="sbl-card">
              <?php if ($img) : ?>
                <a class="sbl-card__media" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true"><?php echo $img; ?></a>
              <?php endif; ?>
              <div class="sbl-card__body">
                <?php if ($mcat) : ?>
                  <a class="sbl-card__cat" href="<?php echo esc_url(get_category_link($mcat)); ?>"><?php echo esc_html($mcat->name); ?></a>
                <?php endif; ?>
                <h3 class="sbl-card__title"><a href="<?php the_permalink(); ?>"><?php echo esc_html(get_the_title()); ?></a></h3>
                <p class="sbl-card__meta"><time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('j F Y')); ?></time> · <?php echo (int) sbl_read_minutes($mid); ?> min read</p>
              </div>
            </article>
              <?php
          endwhile;
          wp_reset_postdata();
          ?>
        </div>
      </div>
    </section>
  <?php endif; ?>
</main>
<?php include __DIR__.'/_foot.php'; })(); ?>
