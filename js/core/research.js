// Research tree. Effects:
//   algo: ×N effective-compute multiplier (algorithmic efficiency)
//   mfu: +N model-FLOPs-utilization
//   dataQ: ×N data quality multiplier
//   memEff: ×N trainable-params-per-VRAM multiplier
//   infEff: ÷N serving cost per request
//   revMult / demandMult: ×N revenue price / market demand
//   gigMult: ×N freelance gig pay
//   rpMult: ×N research point generation
//   powerMult: ×N electricity price (<1 is cheaper)
//   maxRuns: +N concurrent training runs
//   unlock: feature flag ('mx1' gpu, 'synthData' dataset, 'autoRetrain')
// era = min facility phase required. reqCap = min best-model capability.

export const RESEARCH = [
  // ── Era 0: Foundations (garage) ────────────────────────────────
  { id: 'bpe', era: 0, rp: 8, name: 'Better Tokenization',
    fx: { algo: 1.12 },
    desc: 'A clean BPE vocabulary. Fewer tokens wasted on “th” + “e”.' },
  { id: 'mixedprec', era: 0, rp: 15, name: 'Mixed-Precision Training',
    fx: { algo: 1.3 },
    desc: 'FP16/BF16 with loss scaling. Same model, far fewer FLOPs wasted.' },
  { id: 'dataclean1', era: 0, rp: 12, name: 'Dedup & Filtering',
    fx: { dataQ: 1.1 },
    desc: 'Remove duplicates and spam from the corpus. Cleaner data, lower loss.' },
  { id: 'kernels', era: 0, rp: 20, name: 'Hand-Tuned CUDA Kernels',
    fx: { mfu: 0.06 },
    desc: 'Fused ops and tiled matmuls. The GPUs finally stop waiting on memory.' },
  { id: 'lora', era: 0, rp: 18, name: 'LoRA Fine-Tuning',
    fx: { gigMult: 2.5 },
    desc: 'Low-rank adapters make custom-model gigs cheap to deliver. 2.5× gig pay.' },
  { id: 'chinchilla', era: 0, rp: 30, name: 'Scaling-Law Study',
    fx: { algo: 1.15 },
    desc: 'Fit your own loss curves. Now you *know* it’s ~20 tokens per parameter.' },

  // ── Era 1: Scale (office) ──────────────────────────────────────
  { id: 'flash', era: 1, rp: 60, deps: ['kernels'], name: 'FlashAttention',
    fx: { mfu: 0.08 },
    desc: 'IO-aware exact attention. Long contexts stop being a memory bandwidth tragedy.' },
  { id: 'zero', era: 1, rp: 80, deps: ['mixedprec'], name: 'ZeRO / FSDP Sharding',
    fx: { memEff: 2 },
    desc: 'Shard optimizer states across the cluster. 2× larger models fit in the same VRAM.' },
  { id: 'pipeline', era: 1, rp: 120, deps: ['zero'], name: '3D Parallelism',
    fx: { mfu: 0.06, algo: 1.1, ppMult: 3 },
    desc: 'Tensor + pipeline + data parallel. One model, every GPU, no idle bubbles.' },
  { id: 'instruct', era: 1, rp: 90, deps: ['lora'], name: 'Instruction Tuning',
    fx: { revMult: 1.5 },
    desc: 'Models that follow instructions are models people pay for.' },
  { id: 'rlhf', era: 1, rp: 150, deps: ['instruct'], name: 'RLHF',
    fx: { revMult: 1.5, demandMult: 1.3 },
    desc: 'Reinforcement learning from human feedback. Suddenly it’s *helpful*.' },
  { id: 'datapipe', era: 1, rp: 70, deps: ['dataclean1'], name: 'Streaming Data Pipeline',
    fx: { dataQ: 1.12 },
    desc: 'Tokenize and shuffle at line rate. No GPU ever starves for data again.' },
  { id: 'checkpoint', era: 1, rp: 50, name: 'Checkpoint & Auto-Resume',
    fx: { mfu: 0.02, outageGuard: true },
    desc: 'Crash at 3am, resume at 3:01am. Outages barely dent your runs.' },
  { id: 'expmgr', era: 1, rp: 100, name: 'Experiment Cluster Manager',
    fx: { maxRuns: 1, rpMult: 1.25 },
    desc: 'A proper scheduler: run two training jobs at once, sweep faster.' },
  { id: 'quant', era: 1, rp: 110, name: 'INT8 Quantization',
    fx: { infEff: 2 },
    desc: 'Serve in 8-bit. Half the serving FLOPs, customers can’t tell.' },

  // ── Era 2: Frontier (colo) ─────────────────────────────────────
  { id: 'moe', era: 2, rp: 1000, deps: ['pipeline'], name: 'Mixture of Experts',
    fx: { algo: 1.8, infEff: 2 },
    desc: 'Route tokens to sparse experts. Frontier quality at a fraction of the FLOPs.' },
  { id: 'muon', era: 2, rp: 2400, name: 'Second-Order Optimizer',
    fx: { algo: 1.35 },
    desc: 'Beyond Adam: curvature-aware updates. Same loss in fewer steps.' },
  { id: 'specdec', era: 2, rp: 1600, deps: ['quant'], name: 'Speculative Decoding',
    fx: { infEff: 1.8 },
    desc: 'A small draft model proposes, the big one verifies. Serving throughput soars.' },
  { id: 'distill', era: 2, rp: 3200, name: 'Frontier Distillation',
    fx: { algo: 1.3, infEff: 1.5 },
    desc: 'Big teachers, small students. Capability gets cheaper to make and serve.' },
  { id: 'synthData', era: 2, rp: 4800, deps: ['distill'], name: 'Synthetic Data Research',
    fx: { algo: 1.15, unlock: 'synthData' },
    desc: 'Model-generated, verifier-filtered data. Unlocks the Synthetic Data Engine.' },
  { id: 'reasoning', era: 2, rp: 6000, deps: ['rlhf'], name: 'RL on Reasoning Traces',
    fx: { algo: 1.6, revMult: 1.3 },
    desc: 'Reward correct chains of thought. The model learns to *think* before answering.' },
  { id: 'agents', era: 2, rp: 4000, deps: ['instruct'], name: 'Agentic Scaffolding',
    fx: { revMult: 1.4, demandMult: 1.4 },
    desc: 'Tools, memory, multi-step plans. The API stops chatting and starts *doing*.' },
  { id: 'powerDeal', era: 2, rp: 2800, money: 10e6, name: 'Direct Power Contracts',
    fx: { powerMult: 0.7 },
    desc: 'PPAs straight from generators. 30% off every kWh, forever.' },
  { id: 'customSilicon', era: 2, rp: 10e3, money: 50e6, deps: ['pipeline'], name: 'Custom Training Silicon',
    fx: { unlock: 'mx1', ppMult: 3 },
    desc: 'Tape out the Mogul MX-1. Your workload, your chip, your margins.' },
  { id: 'autoML', era: 2, rp: 3600, deps: ['expmgr'], name: 'AutoML Pipeline',
    fx: { maxRuns: 1, unlock: 'autoRetrain' },
    desc: 'Completed runs automatically respawn at the frontier config. The lab trains itself.' },
  { id: 'multimodalR', era: 2, rp: 4400, name: 'Multimodal Pretraining',
    fx: { algo: 1.2, demandMult: 1.5 },
    desc: 'One model: text, vision, audio. Whole new markets open.' },

  // ── Era 3: Superintelligence (hyperscale+) ─────────────────────
  { id: 'worldmodel', era: 3, rp: 40e3, name: 'World-Model Pretraining',
    fx: { algo: 2.0 },
    desc: 'Predict the world, not just the next token. Sample efficiency doubles.' },
  { id: 'selfplay', era: 3, rp: 60e3, deps: ['reasoning'], name: 'Self-Play Curriculum',
    fx: { algo: 2.0 },
    desc: 'Models generate problems just beyond their ability and learn from solving them.' },
  { id: 'aiResearch', era: 3, rp: 100e3, deps: ['agents'], name: 'AI Research Assistants',
    fx: { rpMult: 3, algo: 1.5 },
    desc: 'Your models run the ablations now. Research throughput triples.' },
  { id: 'continual', era: 3, rp: 75e3, name: 'Continual Learning',
    fx: { algo: 1.8 },
    desc: 'No more training from scratch — models keep learning in deployment.' },
  { id: 'waferscale', era: 3, rp: 150e3, money: 500e6, deps: ['customSilicon'], name: 'Wafer-Scale Integration',
    fx: { mfu: 0.08, powerMult: 0.85, ppMult: 10 },
    desc: 'A whole wafer as one chip. Interconnect overhead nearly vanishes.' },
  { id: 'recursion', era: 3, rp: 300e3, reqCap: 80, deps: ['aiResearch', 'selfplay'], name: 'Recursive Self-Improvement',
    fx: { algo: 3.0 },
    desc: 'The model improves the code that trains the model. Handle with care.' },
];

export const ERA_NAMES = ['Foundations', 'Scale', 'Frontier', 'Superintelligence'];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map(r => [r.id, r]));
