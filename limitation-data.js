/* LegalDesk — Limitation engine & dataset
   Source: The Limitation Act, 1963 (Act 36 of 1963, amended up to Act 34 of 2019),
   THE SCHEDULE — Articles 1–137, verbatim periods & "time from which period begins to run".
   condone:
     'none'          -> Suits: Section 5 does NOT apply. Limitation Till is a hard bar.
     'discretionary' -> Appeals/Applications: Section 5 condonation, NO fixed outer limit.
   Special statutes with a HARD, non-condonable outer cap live in LIM_SPECIAL.
*/
(function (root) {
  // Period helpers -------------------------------------------------------
  var Y = function (n) { return { v: n, u: 'y' }; };
  var M = function (n) { return { v: n, u: 'm' }; };
  var D = function (n) { return { v: n, u: 'd' }; };

  function periodLabel(p) {
    if (!p) return '';
    var u = p.u === 'y' ? 'year' : p.u === 'm' ? 'month' : 'day';
    return p.v + ' ' + u + (p.v > 1 ? 's' : '');
  }
  // Add a period to an ISO date (YYYY-MM-DD). Day-1 rule: limitation runs FROM the
  // trigger date, i.e. the trigger day itself is excluded (S.12(1)); the period is
  // added to the trigger date and the resulting date is the last day to file.
  function addPeriod(iso, p) {
    if (!iso || !p) return '';
    var x = iso.split('-');
    var d = new Date(Date.UTC(+x[0], +x[1] - 1, +x[2]));
    if (p.u === 'y') d.setUTCFullYear(d.getUTCFullYear() + p.v);
    else if (p.u === 'm') d.setUTCMonth(d.getUTCMonth() + p.v);
    else d.setUTCDate(d.getUTCDate() + p.v);
    return d.toISOString().split('T')[0];
  }
  function daysBetween(fromIso, toIso) {
    if (!fromIso || !toIso) return null;
    var a = fromIso.split('-'), b = toIso.split('-');
    var da = Date.UTC(+a[0], +a[1] - 1, +a[2]), db = Date.UTC(+b[0], +b[1] - 1, +b[2]);
    return Math.round((db - da) / 86400000);
  }
  function todayIso() {
    var n = new Date();
    return [n.getFullYear(), String(n.getMonth() + 1).padStart(2, '0'), String(n.getDate()).padStart(2, '0')].join('-');
  }

  // Core computation -----------------------------------------------------
  // rule: {period, condone, special?} — period is the prescribed limitation.
  // Returns dates + day-counts for the three columns.
  function compute(triggerIso, rule) {
    var out = { till: '', tillTotal: null, tillLeft: null, stretch: '', stretchTotal: null, stretchLeft: null, stretchKind: '' };
    if (!triggerIso || !rule || !rule.period) return out;
    var t = todayIso();
    out.till = addPeriod(triggerIso, rule.period);
    out.tillTotal = daysBetween(triggerIso, out.till);
    out.tillLeft = daysBetween(t, out.till);
    if (rule.condone === 'capped' && rule.stretchPeriod) {
      // Hard outer cap = prescribed + the statutory extension window.
      out.stretch = addPeriod(out.till, rule.stretchPeriod);
      out.stretchTotal = daysBetween(triggerIso, out.stretch);
      out.stretchLeft = daysBetween(t, out.stretch);
      out.stretchKind = 'capped';
    } else if (rule.condone === 'discretionary') {
      out.stretchKind = 'discretionary'; // S.5 — no fixed outer date
    } else {
      out.stretchKind = 'none'; // suits — not condonable
    }
    return out;
  }

  // ---- FIRST DIVISION — SUITS (Articles 1–113): condone 'none' ----------
  var A = []; // article list
  function push(art, div, part, desc, period, from) {
    A.push({ art: art, div: div, part: part, desc: desc, period: period, from: from,
      condone: div === 'Suit' ? 'none' : 'discretionary' });
  }
  // Part I — Accounts
  push('1','Suit','Accounts','Balance due on a mutual, open & current account',Y(3),'Close of the year in which the last item admitted/proved is entered');
  push('2','Suit','Accounts','Against a factor for an account',Y(3),'When the account is demanded & refused during agency, else when agency terminates');
  push('3','Suit','Accounts','By a principal against agent for movable property received & not accounted for',Y(3),'When account demanded & refused during agency, else when agency terminates');
  push('4','Suit','Accounts','Other suits by principals against agents for neglect/misconduct',Y(3),'When the neglect or misconduct becomes known to the plaintiff');
  push('5','Suit','Accounts','For an account & share of profits of a dissolved partnership',Y(3),'The date of the dissolution');
  // Part II — Contracts (all 3 years)
  var c2 = [
    ['6',"Seaman's wages","End of the voyage during which the wages are earned"],
    ['7','Wages of any other person','When the wages accrue due'],
    ['8','Price of food/drink sold by keeper of hotel, tavern or lodging-house','When the food or drink is delivered'],
    ['9','Price of lodging','When the price becomes payable'],
    ['10','Against a carrier for losing/injuring goods','When the loss or injury occurs'],
    ['11','Against a carrier for non-delivery/delay of goods','When the goods ought to be delivered'],
    ['12','Hire of animals, vehicles, boats or household furniture','When the hire becomes payable'],
    ['13','Balance of money advanced for goods to be delivered','When the goods ought to be delivered'],
    ['14','Price of goods sold & delivered, no fixed credit','The date of delivery of the goods'],
    ['15','Price of goods sold & delivered, paid after fixed credit','When the period of credit expires'],
    ['16','Price of goods to be paid by a bill of exchange, none given','When the period of the proposed bill elapses'],
    ['17','Price of trees or growing crops sold, no fixed credit','The date of the sale'],
    ['18','Price of work done at request, no time fixed for payment','When the work is done'],
    ['19','Money payable for money lent','When the loan is made'],
    ['20','Like suit where lender gave a cheque','When the cheque is paid'],
    ['21','Money lent under agreement payable on demand','When the loan is made'],
    ['22','Money deposited payable on demand (incl. banker)','When the demand is made'],
    ['23','Money payable for money paid for the defendant','When the money is paid'],
    ['24','Money payable for money received for plaintiff','When the money is received'],
    ['25','Money payable for interest','When the interest becomes due'],
    ['26','Money on accounts stated','When accounts are stated in writing signed by defendant (or when future time arrives)'],
    ['27','Compensation for breach of promise to do a thing at a specified time / on contingency','When the time arrives or the contingency happens'],
    ['28','On a single bond where a day is specified','The day so specified'],
    ['29','On a single bond where no day specified','The date of executing the bond'],
    ['30','On a bond subject to a condition','When the condition is broken'],
    ['31','Bill of exchange / promissory note payable at fixed time after date','When the bill or note falls due'],
    ['32','Bill payable at sight/after sight, not fixed time','When the bill is presented'],
    ['33','Bill accepted payable at a particular place','When the bill is presented at that place'],
    ['34','Bill/note payable at fixed time after sight/after demand','When the fixed time expires'],
    ['35','Bill/note payable on demand, no writing restraining suit','The date of the bill or note'],
    ['36','Note/bond payable by instalments','Expiration of the first term (and respective terms for other parts)'],
    ['37','Note/bond payable by instalments with default clause','When default is made (unless waived)'],
    ['38','Note given to third person to deliver after an event','The date of delivery to the payee'],
    ['39','Dishonoured foreign bill, protest & notice','When the notice is given'],
    ['40','Payee vs drawer, bill dishonoured by non-acceptance','The date of the refusal to accept'],
    ['41','Acceptor of accommodation bill vs drawer','When the acceptor pays the amount'],
    ['42','Surety vs principal debtor','When the surety pays the creditor'],
    ['43','Surety vs co-surety','When surety pays in excess of own share'],
    ['44','Policy of insurance (death / loss)','Date of death / occurrence of loss, or date of denial of claim'],
    ['45','Assured to recover premia on voidable policy','When the insurers elect to void the policy'],
    ['46','Under Succession Act s.360/361 to compel refund','The date of payment or distribution'],
    ['47','Money paid on consideration which fails','The date of the failure'],
    ['48','Contribution by party who paid more than share under joint decree','The date of payment in excess of own share'],
    ['49','Co-trustee to enforce contribution vs deceased trustee estate','When the right to contribution accrues'],
    ['50','Manager of joint estate for contribution','The date of the payment'],
    ['51','Profits of immovable property wrongfully received','When the profits are received'],
    ['52','Arrears of rent','When the arrears become due'],
    ['53','Vendor of immovable property for unpaid purchase-money','Time fixed for completing the sale / date of acceptance of title'],
    ['54','Specific performance of a contract','Date fixed for performance, else when plaintiff has notice of refusal'],
    ['55','Compensation for breach of contract not specially provided for','When the contract is broken / breach occurs / (continuing) when it ceases']
  ];
  c2.forEach(function (r) { push(r[0], 'Suit', 'Contracts', r[1], Y(3), r[2]); });
  // Part III — Declarations
  push('56','Suit','Declarations','Declare forgery of an instrument issued/registered',Y(3),'When the issue or registration becomes known to the plaintiff');
  push('57','Suit','Declarations','Declaration that an alleged adoption is invalid / never took place',Y(3),'When the alleged adoption becomes known to the plaintiff');
  push('58','Suit','Declarations','To obtain any other declaration',Y(3),'When the right to sue first accrues');
  // Part IV — Decrees & Instruments
  push('59','Suit','Decrees & Instruments','Cancel/set aside instrument or decree / rescission of contract',Y(3),'When facts entitling to cancellation/rescission first become known');
  push('60(a)','Suit','Decrees & Instruments','Set aside guardian\u2019s transfer — by ward attaining majority',Y(3),'When the ward attains majority');
  push('60(b)(i)','Suit','Decrees & Instruments','By ward\u2019s LR where ward dies within 3 yrs of majority',Y(3),'When the ward attains majority');
  push('60(b)(ii)','Suit','Decrees & Instruments','By ward\u2019s LR where ward dies before majority',Y(3),'When the ward dies');
  // Part V — Immovable
  push('61(a)','Suit','Immovable Property','By a mortgagor to redeem/recover possession of mortgaged property',Y(30),'When the right to redeem or recover possession accrues');
  push('61(b)','Suit','Immovable Property','Recover possession of mortgaged property afterwards transferred by mortgagee',Y(12),'When the transfer becomes known to the plaintiff');
  push('61(c)','Suit','Immovable Property','Recover surplus collections by mortgagee after mortgage satisfied',Y(3),'When the mortgagor re-enters on the mortgaged property');
  push('62','Suit','Immovable Property','Enforce payment of money charged upon immovable property',Y(12),'When the money sued for becomes due');
  push('63(a)','Suit','Immovable Property','By a mortgagee for foreclosure',Y(30),'When the money secured by the mortgage becomes due');
  push('63(b)','Suit','Immovable Property','By a mortgagee for possession of mortgaged property',Y(12),'When the mortgagee becomes entitled to possession');
  push('64','Suit','Immovable Property','Possession based on previous possession (not title), after dispossession',Y(12),'The date of dispossession');
  push('65','Suit','Immovable Property','Possession based on title',Y(12),'When the possession of the defendant becomes adverse to the plaintiff');
  push('66','Suit','Immovable Property','Possession on forfeiture / breach of condition',Y(12),'When the forfeiture is incurred or the condition is broken');
  push('67','Suit','Immovable Property','By a landlord to recover possession from a tenant',Y(12),'When the tenancy is determined');
  // Part VI — Movable
  push('68','Suit','Movable Property','Specific movable property lost / by theft / misappropriation / conversion',Y(3),'When the person entitled first learns in whose possession it is');
  push('69','Suit','Movable Property','Other specific movable property',Y(3),'When the property is wrongfully taken');
  push('70','Suit','Movable Property','Recover movable deposited/pawned from depositary/pawnee',Y(3),'The date of refusal after demand');
  push('71','Suit','Movable Property','Recover movable deposited/pawned then bought for value',Y(3),'When the sale becomes known to the plaintiff');
  // Part VII — Torts
  var tort1 = [
    ['72','Compensation for act/omission under an enactment','When the act or omission takes place'],
    ['73','False imprisonment','When the imprisonment ends'],
    ['74','Malicious prosecution','When plaintiff is acquitted or prosecution otherwise terminates'],
    ['75','Libel','When the libel is published'],
    ['76','Slander','When the words are spoken (or special damage results)'],
    ['77','Loss of service by seduction of servant/daughter','When the loss occurs'],
    ['78','Inducing a person to break a contract','The date of the breach'],
    ['79','Illegal/irregular/excessive distress','The date of the distress'],
    ['80','Wrongful seizure of movable property under legal process','The date of the seizure'],
    ['81','By LRs under Legal Representatives\u2019 Suits Act 1855','The date of death of the person wronged']
  ];
  tort1.forEach(function (r) { push(r[0], 'Suit', 'Torts', r[1], Y(1), r[2]); });
  push('82','Suit','Torts','By LRs under Indian Fatal Accidents Act 1855',Y(2),'The date of death of the person killed');
  push('83','Suit','Torts','Under Legal Representatives\u2019 Suits Act against executor/administrator',Y(2),'When the wrong complained of is done');
  push('84','Suit','Torts','Against one who perverts property to other purposes',Y(2),'When the perversion first becomes known to the person injured');
  var tort3 = [
    ['85','Obstructing a way or watercourse','The date of the obstruction'],
    ['86','Diverting a watercourse','The date of the diversion'],
    ['87','Trespass upon immovable property','The date of the trespass'],
    ['88','Infringing copyright or other exclusive privilege','The date of the infringement'],
    ['89','To restrain waste','When the waste begins'],
    ['90','Injury by an injunction wrongfully obtained','When the injunction ceases'],
    ['91(a)','Compensation for wrongfully taking/detaining specific movable lost/stolen/converted','When the person entitled first learns in whose possession it is'],
    ['91(b)','Compensation for wrongfully taking/injuring/detaining other movable','When wrongfully taken/injured or detainer\u2019s possession becomes unlawful']
  ];
  tort3.forEach(function (r) { push(r[0], 'Suit', 'Torts', r[1], Y(3), r[2]); });
  // Part VIII — Trusts
  push('92','Suit','Trusts','Recover immovable in trust afterwards transferred by trustee for value',Y(12),'When the transfer becomes known to the plaintiff');
  push('93','Suit','Trusts','Recover movable in trust afterwards transferred by trustee for value',Y(3),'When the transfer becomes known to the plaintiff');
  push('94','Suit','Trusts','Set aside transfer of immovable of religious/charitable endowment',Y(12),'When the transfer becomes known to the plaintiff');
  push('95','Suit','Trusts','Set aside transfer of movable of religious/charitable endowment',Y(3),'When the transfer becomes known to the plaintiff');
  push('96','Suit','Trusts','By manager of endowment to recover property transferred by previous manager',Y(12),'Death/resignation/removal of transferor or appointment of plaintiff, whichever later');
  // Part IX — Miscellaneous
  push('97','Suit','Miscellaneous','Enforce a right of pre-emption',Y(1),'When purchaser takes physical possession / when instrument of sale is registered');
  push('98','Suit','Miscellaneous','By person against whom order under O.21 R.63/103 CPC or s.28 PSCC Act made',Y(1),'The date of the final order');
  push('99','Suit','Miscellaneous','Set aside a sale by civil/revenue court or for arrears of revenue',Y(1),'When the sale is confirmed or would otherwise have become final');
  push('100','Suit','Miscellaneous','Alter/set aside decision or order of a civil court / officer of Govt',Y(1),'The date of the final decision/order or the act/order of the officer');
  push('101','Suit','Miscellaneous','Upon a judgment (incl. foreign) or a recognisance',Y(3),'The date of the judgment or recognisance');
  push('102','Suit','Miscellaneous','For property conveyed while insane',Y(3),'When plaintiff is restored to sanity & has knowledge of the conveyance');
  push('103','Suit','Miscellaneous','Make good loss from breach of trust out of deceased trustee\u2019s estate',Y(3),'The date of the trustee\u2019s death, or date of the loss if later');
  push('104','Suit','Miscellaneous','Establish a periodically recurring right',Y(3),'When the plaintiff is first refused the enjoyment of the right');
  push('105','Suit','Miscellaneous','By a Hindu for arrears of maintenance',Y(3),'When the arrears are payable');
  push('106','Suit','Miscellaneous','For a legacy or share of residue / distributive share',Y(12),'When the legacy or share becomes payable or deliverable');
  push('107','Suit','Miscellaneous','For possession of a hereditary office',Y(12),'When the defendant takes possession adversely to the plaintiff');
  push('108','Suit','Miscellaneous','During life of Hindu/Muslim female to declare alienation void',Y(12),'The date of the alienation');
  push('109','Suit','Miscellaneous','By Mitakshara Hindu to set aside father\u2019s alienation of ancestral property',Y(12),'When the alienee takes possession of the property');
  push('110','Suit','Miscellaneous','By person excluded from joint family property to enforce right to share',Y(12),'When the exclusion becomes known to the plaintiff');
  push('111','Suit','Miscellaneous','By/for local authority for possession of public street/road',Y(30),'The date of the dispossession or discontinuance');
  push('112','Suit','Miscellaneous','By/on behalf of Central/State Government (except SC original jurisdiction)',Y(30),'When limitation would run against a like suit by a private person');
  // Part X — Residuary
  push('113','Suit','Residuary','Any suit for which no period is provided elsewhere',Y(3),'When the right to sue accrues');

  // ---- SECOND DIVISION — APPEALS (114–117): condone 'discretionary' -----
  push('114(a)','Appeal','Appeals','Appeal from order of acquittal u/s 417(1)/(2) CrPC 1898',D(90),'The date of the order appealed from');
  push('114(b)','Appeal','Appeals','Appeal from order of acquittal u/s 417(3) CrPC 1898 (special leave)',D(30),'The date of the grant of special leave');
  push('115(a)','Appeal','Appeals','From a sentence of death (Court of Session / HC original criminal)',D(30),'The date of the sentence');
  push('115(b)(i)','Appeal','Appeals','From any other sentence/order (not acquittal) — to the High Court',D(60),'The date of the sentence or order');
  push('115(b)(ii)','Appeal','Appeals','From any other sentence/order (not acquittal) — to any other court',D(30),'The date of the sentence or order');
  push('116(a)','Appeal','Appeals','Under CPC 1908 — to a High Court from any decree or order',D(90),'The date of the decree or order');
  push('116(b)','Appeal','Appeals','Under CPC 1908 — to any other court from any decree or order',D(30),'The date of the decree or order');
  push('117','Appeal','Appeals','From a decree/order of a High Court to the same Court',D(30),'The date of the decree or order');

  // ---- THIRD DIVISION — APPLICATIONS (118–137): condone 'discretionary' -
  push('118','Application','Specified cases','Leave to appear & defend a summary suit',D(10),'When the summons is served');
  push('119(a)','Application','Specified cases','Arbitration Act 1940 — filing of an award in court',D(30),'Date of service of notice of the making of the award');
  push('119(b)','Application','Specified cases','Arbitration Act 1940 — setting aside / remit award',D(30),'Date of service of notice of the filing of the award');
  push('120','Application','Specified cases','CPC — bring LR of deceased plaintiff/appellant/defendant/respondent',D(90),'The date of death of the party');
  push('121','Application','Specified cases','CPC — order to set aside an abatement',D(60),'The date of abatement');
  push('122','Application','Specified cases','Restore a suit/appeal/application dismissed for default',D(30),'The date of dismissal');
  push('123','Application','Specified cases','Set aside ex parte decree / rehear ex parte appeal',D(30),'Date of decree, or when applicant had knowledge (if not duly served)');
  push('124','Application','Specified cases','Review of judgment (court other than Supreme Court)',D(30),'The date of the decree or order');
  push('125','Application','Specified cases','Record an adjustment or satisfaction of a decree',D(30),'When the payment or adjustment is made');
  push('126','Application','Specified cases','Payment of decree amount by instalments',D(30),'The date of the decree');
  push('127','Application','Specified cases','Set aside a sale in execution of a decree',D(60),'The date of the sale');
  push('128','Application','Specified cases','Possession by one dispossessed disputing decree-holder/purchaser',D(30),'The date of dispossession');
  push('129','Application','Specified cases','Possession after removing resistance/obstruction to delivery',D(30),'The date of resistance or obstruction');
  push('130(a)','Application','Specified cases','Leave to appeal as a pauper — to the High Court',D(60),'The date of decree appealed from');
  push('130(b)','Application','Specified cases','Leave to appeal as a pauper — to any other court',D(30),'The date of decree appealed from');
  push('131','Application','Specified cases','Revision under CPC 1908 / CrPC 1898',D(90),'The date of the decree, order or sentence sought to be revised');
  push('132','Application','Specified cases','HC certificate of fitness to appeal to Supreme Court',D(60),'The date of the decree, order or sentence');
  push('133(a)','Application','Specified cases','SLP to Supreme Court — case involving death sentence',D(60),'The date of the judgment, final order or sentence');
  push('133(b)','Application','Specified cases','SLP to Supreme Court — where HC refused leave',D(60),'The date of the order of refusal');
  push('133(c)','Application','Specified cases','SLP to Supreme Court — any other case',D(90),'The date of the judgment or order');
  push('134','Application','Specified cases','Delivery of possession by purchaser at execution sale',Y(1),'When the sale becomes absolute');
  push('135','Application','Specified cases','Enforcement of a decree granting a mandatory injunction',Y(3),'The date of the decree, or the date fixed for performance');
  push('136','Application','Specified cases','Execution of any decree/order (other than mandatory injunction)',Y(12),'When the decree/order becomes enforceable (or on default of directed payment)');
  push('137','Application','Other','Any other application for which no period is provided',Y(3),'When the right to apply accrues');

  // ---- SPECIAL STATUTES with a HARD, non-condonable outer cap -----------
  var SPECIAL = [
    {
      id: 'arb34',
      name: 'Arbitration & Conciliation Act, 1996 — §34(3)',
      desc: 'Application to set aside an arbitral award',
      period: M(3), from: 'Date on which the party received the arbitral award (or disposal of §33 request)',
      condone: 'capped', stretchPeriod: D(30),
      note: 'Court may condone a further 30 days on sufficient cause "but not thereafter" (§34(3) proviso). The 30-day window is a HARD cap.'
    }
  ];

  // Public API -----------------------------------------------------------
  root.LIM = {
    ARTICLES: A,
    SPECIAL: SPECIAL,
    compute: compute,
    addPeriod: addPeriod,
    daysBetween: daysBetween,
    periodLabel: periodLabel,
    // find a rule by article id or special id
    ruleByArticle: function (id) { var a = A.find(function (x) { return x.art === id; }); return a ? { period: a.period, condone: a.condone, meta: a } : null; },
    ruleBySpecial: function (id) { var s = SPECIAL.find(function (x) { return x.id === id; }); return s ? { period: s.period, condone: s.condone, stretchPeriod: s.stretchPeriod, meta: s } : null; }
  };
})(window);
