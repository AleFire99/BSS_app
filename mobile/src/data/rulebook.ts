export type RuleSection = {
  title: string;
  items: string[];
};

export type RuleChapter = {
  id: string;
  title: string;
  book: 'game' | 'tournament';
  sections: RuleSection[];
};

export const RULEBOOK: RuleChapter[] = [
  // ─── COMPREHENSIVE RULES ──────────────────────────────────────────────────────

  {
    id: 'g1', book: 'game',
    title: '1. Game Overview',
    sections: [
      {
        title: 'Winning & Losing',
        items: [
          'Win by reducing your opponent\'s life to 0.',
          'Win if your opponent\'s deck is empty at the start of their turn.',
          'If both conditions are met simultaneously, the game is a draw.',
          'Either player may concede at any time; conceding is immediate and unaffected by effects.',
        ],
      },
      {
        title: 'Core Rules',
        items: [
          'Card text overrides the rulebook when they conflict.',
          'If an action is impossible, skip it. If it involves amounts, do as much as possible.',
          'When both players choose simultaneously, the active player (whose turn it is) chooses first.',
          'Effects on a card are resolved in the order written.',
        ],
      },
    ],
  },

  {
    id: 'g2', book: 'game',
    title: '2. Cards',
    sections: [
      {
        title: 'Card Types',
        items: [
          'Spirit — summoned onto the field; has levels and BP.',
          'Nexus — placed onto the field; provides passive benefits.',
          'Magic — used from hand; effect resolves, then card goes to trash.',
        ],
      },
      {
        title: 'Card Anatomy',
        items: [
          'Name: top of card.',
          'Cost: upper left corner.',
          'Reduction symbols: printed to the right of the cost.',
          'Colors: bottom-right of card frame (can be multiple).',
          'Symbols: lower right corner; determine how many life are taken in an attack.',
          'Levels: listed left of card text (spirits and nexuses only).',
          'BP: printed under each level; determines battle strength.',
        ],
      },
      {
        title: 'Cost & Reduction',
        items: [
          'Cost is the base amount to summon, place, or use a card.',
          'Each symbol on your field that matches one of the card\'s reduction symbols reduces the cost by 1.',
          'Reduction is limited by the number of reduction symbols printed on the card.',
        ],
      },
      {
        title: 'Levels & BP',
        items: [
          'A card\'s level is the highest level whose maintenance cost (cores on the card) is fully met.',
          'The card has the effects and BP of its current level.',
          'Double-color symbols count as either of those colors (player chooses).',
        ],
      },
    ],
  },

  {
    id: 'g3', book: 'game',
    title: '3. Gameplay Areas',
    sections: [
      {
        title: 'The Eight Areas',
        items: [
          'Deck — private; facedown stack; order cannot be viewed or changed.',
          'Hand — private; owner may view and reorder freely; no hand size limit.',
          'Trash — public; faceup stack; both players may view and reorder.',
          'Field — public; spirits and nexuses placed here faceup in refreshed state.',
          'Reserve — public; cores in play but not on a card.',
          'Life Area — public; cores here represent your life.',
          'Burst Area — private; max 1 card; only cards with burst effects may be set here.',
          'Void — public; supply of cores not yet in play.',
        ],
      },
      {
        title: 'Moving Between Areas',
        items: [
          'When a card moves to a new area, treat it as a new card — effects from the previous area don\'t carry over.',
          'Cores on a card moved off the field go to the card owner\'s reserve (unless stated otherwise).',
          'Cards always move to areas belonging to their owner, unless an effect specifies otherwise.',
        ],
      },
    ],
  },

  {
    id: 'g4', book: 'game',
    title: '4. Key Terminology',
    sections: [
      {
        title: 'Effect Types',
        items: [
          'Activated — paid during main step or a flash window; labeled "Main" and/or "Flash".',
          'Constant — continuously active; no cost or activation; turns on/off as conditions change.',
          'Triggered — fires automatically when a specified event occurs.',
          'Magic — activated from magic cards; labeled "Main" and/or "Flash".',
        ],
      },
      {
        title: 'Cores & Soul Core',
        items: [
          'Regular cores sit on cards, in the reserve, life, trash, or void.',
          'Each player has exactly one soul core.',
          'Soul cores cannot be placed into a player\'s life or the void by effects unless that effect specifically targets soul cores.',
          'Soul cores placed in the void can only be moved by effects that specifically target soul cores.',
        ],
      },
      {
        title: 'Tokens',
        items: [
          'Tokens are created by card effects and placed on the field.',
          'While on the field, treat a token as the card type described in the creating effect.',
          'When a token leaves the field for any reason, it is immediately removed from the game.',
        ],
      },
      {
        title: 'Other Terms',
        items: [
          'Refreshed: card placed vertically (upright). Exhausted: card placed horizontally (sideways).',
          'Owner: the player who has the card in their starting deck.',
          'Checkpoint: a moment when game-management rules are checked and applied.',
        ],
      },
    ],
  },

  {
    id: 'g5', book: 'game',
    title: '5. Game Setup',
    sections: [
      {
        title: 'Deck Rules',
        items: [
          'A deck must have 50–60 cards.',
          'Maximum 4 copies of any card with the same name.',
          'Cards with the same name but different additional names count together toward the 4-copy limit.',
        ],
      },
      {
        title: 'Starting the Game',
        items: [
          '1. Both players shuffle their decks; then each may shuffle and/or cut the opponent\'s deck.',
          '2. Place 5 cores from the void into your life area.',
          '3. Place 1 soul core + 3 regular cores from the void into your reserve.',
          '4. Draw 4 cards.',
          '5. Determine Player 1 randomly (coin flip, rock-paper-scissors, etc.). The winner decides who goes first.',
          '6. Starting with Player 1, each player may mulligan once: return your hand to the bottom of the deck, draw 4 new cards, then shuffle. Your opponent may then shuffle/cut your deck.',
          '7. Players who skip the mulligan draw 1 additional card (5 cards total).',
          '8. Player 1 begins their first turn.',
        ],
      },
    ],
  },

  {
    id: 'g6', book: 'game',
    title: '6. Turn Structure',
    sections: [
      {
        title: 'Seven Steps in Order',
        items: [
          '1. Start Step — "at the start of step" effects trigger. Check if active player\'s deck is empty (win condition).',
          '2. Core Step — add 1 core from void to your reserve. Skipped on Player 1\'s first turn.',
          '3. Draw Step — draw 1 card from your deck.',
          '4. Refresh Step — refresh all cards on your field; move all cores from your trash to your reserve.',
          '5. Main Step — in any order: summon spirits, place nexuses, use magic, set 1 burst card, move cores, activate main effects. Declare end when done.',
          '6. Attack Step — attack with refreshed spirits (one at a time). Skipped on Player 1\'s first turn.',
          '7. End Step — "end of turn" effects trigger; "until end of turn" effects expire; turn passes to opponent.',
        ],
      },
      {
        title: 'Main Step Details',
        items: [
          'You may perform any of the listed actions in any order, as many times as you want.',
          'Setting a burst: place a card with a burst effect facedown in your burst area. Only 1 per turn.',
          'Moving cores: you may freely move cores among your field cards and reserve (including swapping soul cores).',
          'When no management remains after an action, you may perform another or declare the main step over.',
        ],
      },
    ],
  },

  {
    id: 'g7', book: 'game',
    title: '7. Attacking & Battles',
    sections: [
      {
        title: 'Battle Sequence',
        items: [
          '1. Attack Declaration: exhaust one of your refreshed spirits. "When attacking" effects trigger.',
          '2. Pre-Block Flash Window: attacked player may use 1 flash effect (or pass), then attacker, alternating until 2 passes in a row.',
          '3. Block Declaration: defending player may exhaust one of their refreshed spirits to block. "When blocking" effects trigger. If no block, skip step 4.',
          '4. Post-Block Flash Window: same alternating flash structure; blocking player\'s controller acts first.',
          '5. Battle Resolution: see below.',
          '6. End of Battle: "when battle ends" effects trigger; "while attacking/blocking/during battle" effects expire.',
        ],
      },
      {
        title: 'Battle Resolution',
        items: [
          'If blocked: compare BP of both spirits. Lower BP is destroyed. Equal BP: both destroyed. (If a spirit already left the field, do nothing.)',
          'If unblocked: move cores from the defending player\'s life to their reserve equal to the attacking spirit\'s symbol count. (If attacker left the field, do nothing.)',
        ],
      },
      {
        title: 'After Each Battle',
        items: [
          'The active player may then attack with another refreshed spirit, or declare the end of the attack step.',
        ],
      },
    ],
  },

  {
    id: 'g8', book: 'game',
    title: '8. Effects',
    sections: [
      {
        title: 'Activating an Effect',
        items: [
          '1. Declare the effect. If it\'s from your hand, reveal the card. If it\'s a burst, flip it faceup.',
          '2. Determine and pay the cost in full (if any). If you can\'t pay fully, the effect doesn\'t activate.',
          '3. The effect is now "waiting to resolve."',
          '4. Resolve in reverse order of activation (most recently activated first). When multiple activate simultaneously, the active player chooses which resolves first.',
        ],
      },
      {
        title: 'Targeting',
        items: [
          'Make target selections when directed during resolution, not at activation.',
          'Must select the full specified number; if fewer are available, select all available.',
          '"Up to N" means you may select 0 through N. "Any number" includes 0.',
          'Cards in private areas: you may ignore any that don\'t meet conditions; selected cards must be revealed to confirm they qualify.',
        ],
      },
      {
        title: 'Effect Costs',
        items: [
          '"You may [cost] to [effect]" — the portion before "to" is the cost.',
          'All parts of a cost must be payable; if any part is impossible, the effect doesn\'t activate.',
        ],
      },
      {
        title: 'Substitution Effects',
        items: [
          'Substitution effects replace one game event with a different outcome.',
          'If multiple apply to the same event, the affected player (or card controller) chooses which one to apply.',
          'Only one substitution effect may apply per event.',
        ],
      },
      {
        title: 'Continuous Effects & BP Changes',
        items: [
          'Apply continuous effects in this order: first non-numerical changes, then numerical changes.',
          'BP changes are applied in sequence: (1) level changes → (2) BP redefined → (3) BP set to a specific value → (4) BP increased or decreased.',
        ],
      },
    ],
  },

  {
    id: 'g9', book: 'game',
    title: '9. Destruction',
    sections: [
      {
        title: 'When Spirits / Nexuses Are Destroyed',
        items: [
          'A spirit or nexus is destroyed if it has fewer cores than its LV1 maintenance cost (checked at checkpoints).',
          'A spirit is destroyed if its BP becomes 0 or less (checked at checkpoints).',
        ],
      },
      {
        title: 'Self-Destruction',
        items: [
          'If the card\'s owner caused the destruction through their own actions or cost payments, it is "self-destruction."',
          'Destruction triggers (e.g. "when destroyed" effects, burst conditions) do not activate on self-destruction.',
        ],
      },
      {
        title: 'Destruction Process',
        items: [
          '1. Check if any substitution effects prevent or replace the destruction.',
          '2. Destruction is confirmed; "when destroyed" triggers activate and wait to resolve.',
          '3. The card goes to the owner\'s trash; all cores on it go to the owner\'s reserve (simultaneously).',
        ],
      },
    ],
  },

  {
    id: 'g10', book: 'game',
    title: '10. Summoning & Playing Cards',
    sections: [
      {
        title: 'Summoning a Spirit',
        items: [
          '1. Reveal the card from your hand.',
          '2. Determine the base cost.',
          '3. Reduce cost by 1 for each matching symbol on your field (limited by the card\'s reduction symbols).',
          '4. Pay cores equal to the reduced cost from your field, reserve, or both — move them to your trash.',
          '5. Place the card on the field and put at least enough cores on it to fulfill its LV1 cost.',
        ],
      },
      {
        title: 'Placing a Nexus',
        items: [
          'Same process as summoning a spirit.',
        ],
      },
      {
        title: 'Using Magic',
        items: [
          'Same cost process as summoning.',
          'After paying, the magic card waits to resolve, then its effect is applied.',
          'After resolution, the magic card goes to your trash.',
        ],
      },
      {
        title: 'Bursts',
        items: [
          'Set a burst card facedown in your burst area during your main step (max 1 per turn; max 1 in the area).',
          'If a second card is set while one is already there, the first is discarded.',
          'Bursts activate for free (no cost) when their trigger condition is met.',
          'After a burst resolves, it goes to the trash.',
          'At the end of the game, all burst cards are flipped up to confirm they have burst effects.',
        ],
      },
    ],
  },

  // Keyword effects live in the Keywords tab (Rulings screen) — single source of truth.

  {
    id: 'g11', book: 'game',
    title: '11. Special Rules',
    sections: [
      {
        title: 'Infinite Loops',
        items: [
          'An infinite loop is a repeating action with no natural end.',
          'Neither player can break it → game ends in a draw.',
          'One player can break it → they declare how many repetitions; that many are performed.',
          'Both players can break it → active player declares a number first, then the opponent; the lower number wins; that many repetitions are performed.',
          'After resolution, voluntarily re-entering the same loop is no longer an option (unless forced by a triggered effect).',
        ],
      },
      {
        title: 'Revealing Cards',
        items: [
          'When moving a card meeting a condition from one private area to another, that card must be revealed even if no instruction says to.',
          'Cards revealed for costs or effects return to being private once the cost or effect is resolved.',
          'Unless specified otherwise, only the controller of the card effect may view cards in private areas.',
        ],
      },
    ],
  },

  // ─── TOURNAMENT RULES ─────────────────────────────────────────────────────────

  {
    id: 't1', book: 'tournament',
    title: '1. Deck & Card Requirements',
    sections: [
      {
        title: 'Deck Construction',
        items: [
          'Standard format: 50–60 cards; max 4 copies per card name.',
          'Sideboard: up to 10 cards (Best-of-3 events only). Deck must stay 50–60 after any swap.',
          'Limited format: minimum 20 cards; unlimited copies of any card.',
          'No cards from the suspension/ban list, test prints, or counterfeit cards.',
          'Only genuine Battle Spirits Saga TCG cards are allowed (no Japanese Battle Spirits cards).',
        ],
      },
      {
        title: 'Card Sleeves',
        items: [
          'Sleeves are mandatory at all official events.',
          'All sleeves must match in color, design, size, and condition.',
          'Sleeve backs must be opaque and non-reflective.',
          'Artwork must not extend to the edges of the sleeve (solid-color border required).',
        ],
      },
      {
        title: 'Deck Checks',
        items: [
          'A deck list must be submitted before the tournament; the deck cannot be changed once submitted.',
          'At least 10% of deck lists are checked at Premier events.',
          'Judges verify: legible deck list, legal card contents, sleeves are uniform and unmarked.',
        ],
      },
    ],
  },

  {
    id: 't2', book: 'tournament',
    title: '2. Match Formats',
    sections: [
      {
        title: 'Time Limits',
        items: [
          'Best of 1: 35-minute time limit.',
          'Best of 3: 60-minute time limit.',
          'Overtime for Game 1 or 3: active player completes their turn, then 3 more turns are played (5-minute extension).',
          'Overtime for Game 2 (Best-of-3): active player completes their turn; if no winner, the game is incomplete and doesn\'t count.',
        ],
      },
      {
        title: 'First Player in Game 2 & 3',
        items: [
          'The player who lost the previous game chooses who goes first.',
        ],
      },
      {
        title: 'Between Games (Best-of-3)',
        items: [
          'After a game, both players may swap cards between their deck and sideboard.',
          'Deck must remain 50–60 cards after any swaps.',
          'After the match, return sideboard cards to their original positions to match the deck list.',
        ],
      },
      {
        title: 'Match Resolution — Swiss',
        items: [
          'Time called during Game 1: move to tiebreakers.',
          'Time called between or during Game 2: winner of Game 1 wins the match.',
          'Time called between Games 2 & 3: start Game 3 in overtime turns.',
          'Time called during Game 3: move to tiebreakers.',
        ],
      },
      {
        title: 'Match Resolution — Single Elimination',
        items: [
          'Same procedures as Swiss, except a draw is not a valid result — tiebreakers are applied until a winner is found.',
        ],
      },
    ],
  },

  {
    id: 't3', book: 'tournament',
    title: '3. Tiebreakers',
    sections: [
      {
        title: 'When Extra Turns Don\'t Decide a Winner',
        items: [
          '1st: Highest life total wins.',
          '2nd: Most cards remaining in deck wins.',
          '3rd: Fewest total cores on field + reserve + trash (not counting life) wins.',
          'Still tied: continue playing until life totals become unequal or a victory condition is met.',
        ],
      },
      {
        title: 'Swiss Standings Tiebreakers',
        items: [
          '1st: Opponents\' Win Percentage (highest wins).',
          '2nd: Opponents\' Opponents\' Win Percentage (highest wins).',
          '3rd: Head-to-head (only if exactly 2 players tied and they played each other).',
          'Still tied: tiebreaker game may be played.',
        ],
      },
    ],
  },

  {
    id: 't4', book: 'tournament',
    title: '4. Tournament Structure',
    sections: [
      {
        title: 'Round Formats',
        items: [
          'Swiss: players with similar records are paired each round.',
          'Single Elimination: one loss and you\'re out.',
          'Swiss + Single Elimination: Swiss rounds followed by a top-cut bracket.',
          'Minimum 8 players required to run a sanctioned event.',
        ],
      },
      {
        title: 'Round Count by Player Count',
        items: [
          '4–8 players: 3 Swiss rounds.',
          '9–16 players: 4 Swiss + Top 4 (2 SE rounds).',
          '17–32 players: 5 Swiss + Top 8 (3 SE rounds).',
          '33–64 players: 6 Swiss + Top 8.',
          '65–128 players: 7 Swiss + Top 8.',
          '129–256 players: 8 Swiss + Top 16 (4 SE rounds).',
          '257+ players: Day 1 = 7 Swiss (X-2 or better advances); Day 2 continues.',
        ],
      },
      {
        title: 'Concessions & Draws',
        items: [
          'Players may concede a game or match at any time before the result is reported.',
          'Players may NOT ask the opponent to concede, offer a draw, bribe, or decide results randomly.',
        ],
      },
    ],
  },

  {
    id: 't5', book: 'tournament',
    title: '5. Shuffling',
    sections: [
      {
        title: 'Randomization Rules',
        items: [
          'Fully randomize your deck at the start of each game.',
          'Present deck to opponent; they may shuffle and/or cut.',
          'You may cut your own deck once after the opponent is done — no further randomization after that.',
          'A judge may shuffle a deck as part of a fix; no player may shuffle afterward.',
          'Insufficient randomization is a violation and may carry a penalty.',
        ],
      },
    ],
  },

  {
    id: 't6', book: 'tournament',
    title: '6. Penalties',
    sections: [
      {
        title: 'Penalty Levels',
        items: [
          'Caution — minor error; recorded. Repeated = upgraded to Warning.',
          'Warning — error with advantage gained or game-state impact. Repeated = Game Loss or worse.',
          'Game Loss — major error causing irreversible confusion or unfair advantage.',
          'Match Loss — severe; game state can\'t be fairly repaired.',
          'Disqualification — tournament integrity affected; player is removed, loses all prizes, and is reported to Bandai.',
        ],
      },
      {
        title: 'Common Infraction Categories',
        items: [
          'Game Play Error (Minor/Major): illegal plays, missed triggers, confused game state.',
          'Deck Legality (Minor/Major): incorrect sleeves, wrong card counts, counterfeit cards.',
          'Slow Play (Minor): deliberately stalling, excessive deliberation, repetitive useless actions.',
          'Unsporting Conduct (Minor/Major/Severe): disruptive behavior, intimidation, cheating.',
          'Cheating always results in Disqualification: lying, rigging the deck, adding cards from trash or hand.',
        ],
      },
    ],
  },
];
