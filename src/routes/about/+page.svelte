<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const S3 = 'https://s3.ap-northeast-1.amazonaws.com/unsigs.com/images/256';

  function imgUrl(id: number): string {
    return `${S3}/${id.toString().padStart(5, '0')}.png`;
  }

  let visibleSections = $state<Set<string>>(new Set());

  onMount(() => {
    if (!browser) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections = new Set([...visibleSections, entry.target.id]);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );

    const sections = document.querySelectorAll('.reveal');
    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });

  // building block example IDs
  const colorExamples = [
    { id: 9, label: 'red' },
    { id: 8, label: 'green' },
    { id: 7, label: 'blue' },
  ];

  const distributionExamples = [
    { id: 5, label: 'cumulative' },
    { id: 6, label: 'normal' },
  ];

  const rotationExamples = [
    { id: 16, label: '0°, 0°' },
    { id: 17, label: '0°, 90°' },
    { id: 18, label: '0°, 180°' },
  ];

  const multiplierExamples = [
    { id: 1, label: '×0.5' },
    { id: 7, label: '×1' },
    { id: 10, label: '×2' },
    { id: 13, label: '×4' },
  ];

  const stackingExamples = [
    { id: 0, props: 0 },
    { id: 7, props: 1 },
    { id: 16, props: 2 },
    { id: 264, props: 3 },
    { id: 10000, props: 4 },
    { id: 20000, props: 5 },
    { id: 31000, props: 6 },
  ];
</script>

<div class="about-page">
  <article class="about-content prose prose-invert">
    <h1 class="font-serif">unsigned_algorithms</h1>

    <!-- THE QUESTION -->
    <section>
      <h2 class="font-serif">a question</h2>
      <p>
        unsigned_algorithms started as a question: "why would anyone buy a link to a jpg?"
      </p>
      <p>
        the prompt wasn't to make a better jpg. the response was to make something that was
        more than a link, or reference, but rather intrinsically was something in and of
        itself. art that exists as code on-chain, not just a pointer to an image stored
        somewhere else.
      </p>
      <p>
        if a typical nft is like the deed to a house, then each piece in this work is more
        like the blueprint to a house. each nft contains not just a link to an image, but a
        reference to the actual code that generates its unique color field.
      </p>
    </section>

    <!-- CONTEXT -->
    <section>
      <h2 class="font-serif">context</h2>
      <p>
        when concrete, steel, and glass became available as building materials, architects
        didn't use them to build the same old stone buildings. the new materials enabled
        entirely new forms. the open plan, the curtain wall, the cantilever. modernism
        wasn't just old architecture made with new stuff. it was a new architecture that
        could only exist because of new materials.
      </p>
      <p>
        the same logic applies here. on-chain art is more than just a storage container
        for existing forms. it can and should be its own medium. one where the code is
        the art, and the image is just one possible output.
      </p>
    </section>

    <!-- PRECEDENT -->
    <section>
      <h2 class="font-serif">precedent</h2>
      <p>
        sol lewitt (1928-2007) created wall drawings that existed as written instructions.
        the instructions could be executed by anyone, in any space, at any time. the art
        was the algorithm, not the physical result. a wall drawing might read: "lines from
        the center of the wall to specific points on a grid."
      </p>
      <p>
        unsigned_algorithms follows this lineage. each piece is a set of properties, digital
        dna, which when passed to the code in the genesis piece (#00000) produces a color
        field. the properties are the art. the image is an execution.
      </p>
    </section>

    <!-- BUILDING BLOCKS -->
    <section>
      <h2 class="font-serif">building blocks</h2>
      <p>
        every piece in the collection is generated from combinations of four parameters.
        each property is a tuple of color, distribution, rotation, and multiplier.
      </p>

      <div class="param-block">
        <h3>color</h3>
        <p>red, green, and blue. the three 8-bit channels, 0 to 255.</p>
        <div id="colors" class="example-grid cols-3 reveal" class:visible={visibleSections.has('colors')}>
          {#each colorExamples as ex, i}
            <figure style="animation-delay: {i * 100}ms">
              <img src={imgUrl(ex.id)} alt="unsig #{ex.id.toString().padStart(5, '0')}" loading="lazy" />
              <figcaption>{ex.label}</figcaption>
            </figure>
          {/each}
        </div>
      </div>

      <div class="param-block">
        <h3>distribution</h3>
        <p>
          how color values are spread across the image. cumulative (cdf) produces smooth
          gradients; normal produces a concentrated bell-curve peak.
        </p>
        <div id="distributions" class="example-grid cols-2 reveal" class:visible={visibleSections.has('distributions')}>
          {#each distributionExamples as ex, i}
            <figure style="animation-delay: {i * 100}ms">
              <img src={imgUrl(ex.id)} alt="unsig #{ex.id.toString().padStart(5, '0')}" loading="lazy" />
              <figcaption>{ex.label}</figcaption>
            </figure>
          {/each}
        </div>
      </div>

      <div class="param-block">
        <h3>rotation</h3>
        <p>
          each property layer can be rotated: 0°, 90°, 180°, or 270°. when multiple layers
          are stacked at different rotations, interference patterns emerge.
        </p>
        <div id="rotations" class="example-grid cols-3 reveal" class:visible={visibleSections.has('rotations')}>
          {#each rotationExamples as ex, i}
            <figure style="animation-delay: {i * 100}ms">
              <img src={imgUrl(ex.id)} alt="unsig #{ex.id.toString().padStart(5, '0')}" loading="lazy" />
              <figcaption>{ex.label}</figcaption>
            </figure>
          {/each}
        </div>
      </div>

      <div class="param-block">
        <h3>multiplier</h3>
        <p>
          the distribution curve is scaled by an unsigned integer (0.5, 1, 2, or 4). when
          the scaled value exceeds 255 it rolls over in 8-bit unsigned integer space, creating
          repetitions and interference in the gradient.
        </p>
        <div id="multipliers" class="example-grid cols-4 reveal" class:visible={visibleSections.has('multipliers')}>
          {#each multiplierExamples as ex, i}
            <figure style="animation-delay: {i * 100}ms">
              <img src={imgUrl(ex.id)} alt="unsig #{ex.id.toString().padStart(5, '0')}" loading="lazy" />
              <figcaption>{ex.label}</figcaption>
            </figure>
          {/each}
        </div>
      </div>
    </section>

    <!-- STACKING -->
    <section>
      <h2 class="font-serif">stacking</h2>
      <p>
        each piece can have up to six property layers. the genesis piece (#00000) has none,
        a blank canvas holding only the code. as layers stack, simple gradients become complex
        color fields through additive blending.
      </p>
      <div id="stacking" class="example-grid cols-7 reveal" class:visible={visibleSections.has('stacking')}>
        {#each stackingExamples as ex, i}
          <figure style="animation-delay: {i * 80}ms">
            <img src={imgUrl(ex.id)} alt="unsig #{ex.id.toString().padStart(5, '0')}" loading="lazy" />
            <figcaption>{ex.props === 0 ? 'genesis' : `${ex.props} prop${ex.props > 1 ? 's' : ''}`}</figcaption>
          </figure>
        {/each}
      </div>
    </section>

    <!-- THE COLLECTION -->
    <section>
      <h2 class="font-serif">the collection</h2>
      <p>
        the four parameters produce 50,063,860 possible combinations. nine elimination rules
        filter these down to 31,119. the final collection.
      </p>
      <ul class="filter-list">
        <li>property combinations must be unique</li>
        <li>sum of multipliers must be under 11.5</li>
        <li>half-color (×0.5) multiplier restrictions</li>
        <li>maximum two ×0.5 multipliers per combination</li>
        <li>one ×0.5 multiplier per channel maximum</li>
        <li>removal of non-sensible images</li>
        <li>elimination of rotational symmetry</li>
        <li>elimination of mirror symmetry</li>
        <li>removal of visually identical permutations</li>
      </ul>
      <p>
        what remains is a curated set. not random generation, but a deliberate filtering of
        the possibility space. every piece that exists has earned its place by being distinct.
      </p>
    </section>

    <!-- SCARCITY -->
    <section>
      <h2 class="font-serif">scarcity</h2>
      <p>
        the elimination rules create a non-uniform distribution. most pieces have four or five
        properties; single-property pieces are exceedingly rare (only 15 exist), and six-property
        pieces are uncommon.
      </p>
      <div class="distribution-table">
        <table>
          <thead>
            <tr>
              <th>properties</th>
              <th>count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>0</td><td>1</td></tr>
            <tr><td>1</td><td>15</td></tr>
            <tr><td>2</td><td>246</td></tr>
            <tr><td>3</td><td>2,164</td></tr>
            <tr><td>4</td><td>9,553</td></tr>
            <tr><td>5</td><td>14,575</td></tr>
            <tr><td>6</td><td>4,565</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        beyond vertical scarcity (number of properties), there is horizontal scarcity.
        the value created when pieces are paired together. a composition of unsigs can produce
        something greater than any individual piece.
      </p>
    </section>

    <!-- GOAL -->
    <section>
      <h2 class="font-serif">the goal</h2>
      <p class="goal-quote font-serif">
        "produce a collection of pieces which begin a conversation around what the potential
        for this medium is"
      </p>
      <p>
        unsigned_algorithms is not an attempt to answer the question of what on-chain art
        should be. it is an attempt to start asking it.
      </p>
    </section>

    <!-- THE ARTIST -->
    <section>
      <h2 class="font-serif">the artist</h2>
      <p>
        unsigned_algorithms is the work of alexander watanabe, formally trained as an architect,
        self-taught programmer and failed writer.
      </p>
    </section>
  </article>
</div>

<style>
  .about-page {
    min-height: 100vh;
    background: var(--bg-void);
    padding: var(--space-xl) var(--space-lg);
    padding-bottom: var(--space-2xl);
  }

  .about-content {
    margin-left: max(2rem, 10vw);
    max-width: 60ch;
  }

  .about-content h1 {
    font-size: var(--text-2xl);
    color: var(--text-primary);
    margin-bottom: var(--space-2xl);
    font-weight: 400;
  }

  .about-content section {
    margin-bottom: var(--space-2xl);
  }

  .about-content h2 {
    font-size: var(--text-xl);
    color: var(--text-primary);
    margin-bottom: var(--space-md);
    font-weight: 400;
  }

  .about-content h3 {
    font-size: var(--text-base);
    color: var(--text-primary);
    margin: var(--space-lg) 0 var(--space-xs) 0;
    font-weight: 400;
  }

  .about-content p {
    color: var(--text-secondary);
    line-height: 1.8;
    font-size: var(--text-sm);
    margin-bottom: var(--space-md);
  }

  .about-content p:last-child {
    margin-bottom: 0;
  }

  /* Parameter sub-blocks */
  .param-block {
    margin-bottom: var(--space-lg);
  }

  .param-block p {
    margin-bottom: var(--space-sm);
  }

  /* Image grids */
  .example-grid {
    display: grid;
    gap: 1px;
    margin-top: var(--space-sm);
    max-width: 100%;
  }

  .example-grid.cols-2 { grid-template-columns: repeat(2, 1fr); max-width: 256px; }
  .example-grid.cols-3 { grid-template-columns: repeat(3, 1fr); max-width: 384px; }
  .example-grid.cols-4 { grid-template-columns: repeat(4, 1fr); max-width: 512px; }
  .example-grid.cols-7 { grid-template-columns: repeat(7, 1fr); max-width: 100%; }

  .example-grid figure {
    margin: 0;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
  }

  .example-grid.visible figure {
    opacity: 1;
    transform: translateY(0);
  }

  .example-grid figure img {
    width: 100%;
    aspect-ratio: 1;
    display: block;
    object-fit: cover;
  }

  .example-grid figcaption {
    font-size: 0.65rem;
    color: var(--text-dim);
    text-align: center;
    padding-top: 4px;
  }

  /* Filter list */
  .filter-list {
    list-style: none;
    padding: 0;
    margin: var(--space-md) 0;
  }

  .filter-list li {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.8;
    padding-left: 1.2em;
    position: relative;
  }

  .filter-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--text-dim);
  }

  /* Distribution table */
  .distribution-table {
    margin: var(--space-md) 0;
  }

  .distribution-table table {
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .distribution-table th {
    color: var(--text-dim);
    font-weight: 400;
    text-align: left;
    padding: 2px var(--space-lg) 2px 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .distribution-table td {
    color: var(--text-secondary);
    padding: 2px var(--space-lg) 2px 0;
  }

  /* Goal quote */
  .goal-quote {
    font-size: var(--text-lg) !important;
    color: var(--text-primary) !important;
    font-style: italic;
    line-height: 1.5 !important;
    margin-bottom: var(--space-lg) !important;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .about-page {
      padding: var(--space-lg) var(--space-md);
    }

    .about-content {
      margin-left: 0;
      margin-right: 0;
    }

    .about-content h1 {
      font-size: var(--text-xl);
      margin-bottom: var(--space-xl);
    }

    .about-content h2 {
      font-size: var(--text-lg);
    }

    .about-content section {
      margin-bottom: var(--space-xl);
    }

    .example-grid.cols-7 {
      grid-template-columns: repeat(4, 1fr);
    }

    .example-grid.cols-4 {
      max-width: 100%;
    }

    .example-grid.cols-3 {
      max-width: 100%;
    }

    .example-grid.cols-2 {
      max-width: 100%;
    }

    .goal-quote {
      font-size: var(--text-base) !important;
    }
  }
</style>
