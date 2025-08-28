---
title: Censorship Resistance
layout: single

url: /architecture/censorship-resistance
---
# Censorship Resistance

Censorship resistance is critical for time-sensitive applications such as auctions, 
liquidations, voting, and dispute periods. For example, in an auction, 
an adversary could selectively censor bids from other participants, submit 
their own bid at a minimal value, and win the auction for almost free. 

<iframe src="https://player.vimeo.com/video/1034094359" width="853" height="480" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>

**pod provides strong censorship resistance**, confirming transactions within one 
network round trip (2 delta). To censor a transaction, an adversary would need 
to break the network's liveness, which requires controlling one-third of the network. 
Let's examine this in detail.

## Blockchains vs pod

To understand a network's censorship resistance, we must analyze the transaction lifecycle 
from submission to confirmation, identifying points where censorship can occur.

**Blockchains (Consensus Protocols).** Most blockchains use leader-based consensus protocols. 
The leader selects transactions from the mempool, batches them into a block, and sends 
them to validators. After several voting rounds, validators finalize the block and its 
transactions. Leaders have complete discretion over which transactions to include and 
can selectively exclude transactions. A transaction can be censored until 
an honest leader is elected who will includes it in his proposed block. This can take
seconds to minutes depending on the consensus protocol and the network config. 
For a complete comparison of censorship-resistance provided by different consensus protocols, 
including DAG-based protocols or existing consensus protocols with amendments like inclusion lists, 
see the [full report](https://www.commonprefix.com/static/clients/flashbots/flashbots_report.pdf).

**Optimistic/ZK Layer-2s (L2s).** L2s today rely on centralized sequencers to propose all L2 blocks. 
A compromised sequencers can censor transactions forever. Some L2s enable 
force-inclusion through L1s, requiring L1-posted transactions to be included after a delay 
(Arbitrum requires a 1-day delay). This implies that the transaction censorship depends on L1 censorship 
plus the inclusion delay.

**pod.** pod operates without leaders or sequencers. Transactions are streamed directly 
to the active validators, who validate them locally and return attestations. Once a user 
receives sufficient attestations (>2/3 of validators), the transaction is confirmed. 
This design ensures all honest transactions are confirmed within one network round trip 
(2 delta). To delay or censor a transaction, even temporarily, an adversary would need 
to control at least 1/3 of the network. 

For a deeper dive into censorship resistance offered by existing consensus protocols, 
review the presentation below or refer to the full technical report 
[here](https://www.commonprefix.com/static/clients/flashbots/flashbots_report.pdf).

<iframe src="https://www.youtube.com/embed/O4MUHwJMgkI" width="853" height="480" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
