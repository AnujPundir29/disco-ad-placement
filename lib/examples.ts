// Mirrors data/example_advertisers.txt (the provided sample inputs), kept as a
// TS array so the client bundle doesn't need a .txt loader.
export const exampleAdvertisers = [
  "We sell premium dog food for senior dogs, targeting owners who care about joint health and longevity. Grain-free, vet-formulated, subscription-based.",
  "A sustainable activewear brand for women. Made from recycled ocean plastic. Price point sits between Lululemon and Girlfriend Collective.",
  "We make a non-alcoholic sparkling drink with adaptogens. It's for people who want to feel good without a hangover, kind of like a functional cocktail alternative.",
  "Small-batch candles poured by hand in Vermont. Natural soy wax, no synthetic fragrances. Mostly bought as gifts.",
  "We help people feel better.",
  "Technical outerwear for serious backcountry skiers. Our shells are what patrollers wear. Starts at $650, goes up from there.",
  "B2B SaaS for dental practices. We automate their patient recall workflow.",
  "A new kind of thing for moms.",
  "Refillable, concentrated cleaning products. Skip the single-use plastic bottles. Works as well as the big brands. We want to show up where people who already care about sustainability are checking out.",
  "Custom-fit leather handbags, Italian-made, handcrafted in Florence. Minimum order ships in 6 weeks. Average price point $1,200.",
  "We sell protein bars that don't taste like cardboard. That's basically the whole pitch.",
  "A subscription box for new cat owners. First three months of their cat's life. Toys, food samples, a little booklet about what to expect.",
  "Workout supplements: pre-workout, creatine, protein. We compete on price, not on marketing. Same formulations as the expensive brands for half the cost.",
  "Bedding. Linen. Actually-breathable stuff made in Portugal. Our customers are mostly people who got tired of the Brooklinen/Parachute aesthetic and want something a little more grown-up.",
  "idk just try it",
];

// Zero-based indices that get an accent tag chip in the example picker —
// the deliberately-tricky inputs worth showing off.
export const exampleTags: Record<number, string> = {
  4: "vague", // "We help people feel better."
  6: "off-catalog", // B2B dental SaaS
  14: "garbage", // "idk just try it"
};
