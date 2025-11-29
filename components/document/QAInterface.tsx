'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Bot, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  conversationId?: string;
  sources?: Array<{
    text: string;
    score: number;
    metadata: {
      documentId?: string;
      pageNumber?: number;
      chunkIndex?: number;
      text?: string;
      userId?: string;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      endChar?: number;
      fileName?: string;
      fileType?: string;
      startChar?: number;
    };
  }>;
  model?: string;
  createdAt: Date | string;
}

export interface QAInterfaceProps {
  documentId: string;
  conversationId?: string;
  onConversationIdChange?: (id: string) => void;
  className?: string;
}

export function QAInterface({ documentId, conversationId, onConversationIdChange, className }: QAInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    if (currentConversationId) {
      loadConversationHistory(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 128; // max-h-32 = 128px
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  // Auto-scroll to bottom when new messages arrive or loading state changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 0);
      }
    }
  }, [messages, loading]);

  const loadConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`/api/ai/query?conversationId=${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setMessages(
            data.messages.map(
              (msg: {
                id: string;
                role: 'user' | 'assistant';
                content: string;
                sources?: unknown;
                model?: string;
                createdAt: string | Date;
              }) => ({
                ...msg,
                createdAt: new Date(msg.createdAt),
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          documentIds: [documentId],
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          model: data.model,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation ID if it's a new conversation
        if (data.conversationId && data.conversationId !== currentConversationId) {
          setCurrentConversationId(data.conversationId);
          onConversationIdChange?.(data.conversationId);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${
          error instanceof Error ? error.message : 'Failed to process your question. Please try again.'
        }`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    setMessages([
      {
        id: 'f300fd0a-da59-4013-ab8d-32d901af5310',
        conversationId: '8791e6ae-196b-4c3f-a41a-eae4116fa32a',
        role: 'user',
        content: 'Explain page 3 of the document for me',
        sources: undefined,
        model: undefined,
        createdAt: '2025-11-29T19:11:43.027Z',
      },
      {
        id: '1b330c49-1815-4878-afe1-d7296365190d',
        conversationId: '8791e6ae-196b-4c3f-a41a-eae4116fa32a',
        role: 'assistant',
        content:
          'Page 3 of the document appears to focus on the categorization of knowledge integration methods utilizing Knowledge Graphs (KGs), the consolidation of resources for evaluating hallucinations in Large Language Models (LLMs), and emphasizes the significance of certain open research directions where KGs can have a pivotal role [3]. It outlines the importance of robust detection of hallucinations, providing a fine-grained overview of specific hallucinatory text spans. Furthermore, it stresses the need for developing effective methods for integrating knowledge into LLMs that go beyond the conventional textual prompting techniques.\n\nThe document also highlights the necessity for evaluating the factuality of LLM outputs in a diverse set of conditions including multiprompt, multilingual, and multitask scenarios to achieve a comprehensive analysis of model performance. This approach aims to address the challenges posed by the nuanced and multi-faceted nature of hallucinations in generated text, which can significantly impact the reliability and trustworthiness of LLM outputs.\n\nMoreover, the document discusses the structure of the paper, indicating that it includes sections dedicated to modern datasets and benchmarks for evaluating hallucinations, the feasibility of mitigating hallucinations, an overview of detection methods, strategies for integrating additional knowledge to mitigate hallucinations, and current methods for evaluating the presence of hallucinations in LLM outputs. The final section is meant to summarize identified research gaps, pointing towards areas that require further investigation and development.\n\nIn essence, page 3 serves to set the stage for a detailed exploration of the challenges and potential solutions related to hallucinations in LLM outputs, emphasizing the critical role of KGs in enhancing the robustness and reliability of these models. It calls for a multifaceted approach to evaluating and mitigating hallucinations, highlighting the need for innovation in knowledge integration and the evaluation of LLMs across various languages and tasks [3].',
        sources: [
          {
            text: 'hether a\nparticular piece of text generated by an LLM contains any form\nof hallucinations. This is a difficult task due to the multi-faceted\nnature of the problem.\nGraphEval Sansford et al. (2024) proposes a two-stage\nmethod for detecting and mitigating hallucinations with re-\nspect to a given textual context as ground-truth. The detection\n3\n\n-- 3 of 7 --\n\nmethodology proposes extracting atomic claims from the LLM\noutput as a sub-graph by LLM-prompting and comparing each\ntriple’s entailment to the given textual context.\nSimilarly, Rashad et al. (2024) extracts KG subgraphs be-\ntween source and generated text based on named entities (or-\nganizations, places, people, etc.) to then compare the align-\nment between the two graphs. Classification of the hallucina-\ntion is done by thresholding the alignment. If a KG is built\naround named entities, this could lead to information loss on\nmore abstract concepts, therefore improvements can be made\ntowards more comprehensive relation extraction. KGR Guan\net al. (2024) also performs hallucination detection through des-\nignated system modules for claim extraction, fact selection, and\nverification. Fact selection relies on the information extraction\nabilities of LLM’s, which in themselves are prone to halluci-\nnations, therefore this raises a problem of effective and reliable\nquery generation based on the given claims. Fleek Fatahi Bayat\net al. (2023) is a system demonstration aimed for fact-checking.\nThe authors extract relevant claims as structured triples and ver-\nify them against a KG or a Web search engine by generating\nquestions with a separate LLM based on the extracted claims.\nThe general trend of evaluating claims on an atomic level\nby representing them as KG structures enables output inter-\npretability by allowing to return the inconsistent triples. This\nenables highlighting of problematic text spans and scrutiny of\nthe output. Manual evaluation can also benefit understanding\nproblematic use cases.',
            score: 0.13809717712599365,
            metadata: {
              text: 'hether a\nparticular piece of text generated by an LLM contains any form\nof hallucinations. This is a difficult task due to the multi-faceted\nnature of the problem.\nGraphEval Sansford et al. (2024) proposes a two-stage\nmethod for detecting and mitigating hallucinations with re-\nspect to a given textual context as ground-truth. The detection\n3\n\n-- 3 of 7 --\n\nmethodology proposes extracting atomic claims from the LLM\noutput as a sub-graph by LLM-prompting and comparing each\ntriple’s entailment to the given textual context.\nSimilarly, Rashad et al. (2024) extracts KG subgraphs be-\ntween source and generated text based on named entities (or-\nganizations, places, people, etc.) to then compare the align-\nment between the two graphs. Classification of the hallucina-\ntion is done by thresholding the alignment. If a KG is built\naround named entities, this could lead to information loss on\nmore abstract concepts, therefore improvements can be made\ntowards more comprehensive relation extraction. KGR Guan\net al. (2024) also performs hallucination detection through des-\nignated system modules for claim extraction, fact selection, and\nverification. Fact selection relies on the information extraction\nabilities of LLM’s, which in themselves are prone to halluci-\nnations, therefore this raises a problem of effective and reliable\nquery generation based on the given claims. Fleek Fatahi Bayat\net al. (2023) is a system demonstration aimed for fact-checking.\nThe authors extract relevant claims as structured triples and ver-\nify them against a KG or a Web search engine by generating\nquestions with a separate LLM based on the extracted claims.\nThe general trend of evaluating claims on an atomic level\nby representing them as KG structures enables output inter-\npretability by allowing to return the inconsistent triples. This\nenables highlighting of problematic text spans and scrutiny of\nthe output. Manual evaluation can also benefit understanding\nproblematic use cases.',
              userId: 'TtBUjB62HWUCSPU7dYGEEXui4ys8E2V3',
              endChar: 1977,
              fileName: 'Knowledge Graphs, Large Language Models, and Hallucinations: An NLP Perspective',
              fileType: 'pdf',
              createdAt: '2025-11-18T22:20:20.399Z',
              startChar: 0,
              chunkIndex: 8,
              documentId: 'cfc833b1-5ef8-411e-b4bb-7f5c1e057a7d',
            },
          },
          {
            text: 'MH, RC \tResponse\nSimpleQA Ope-\nnAI (2024)\nMulti-domain Hallc. Evaluation (QA) \tTest \t1 \t4.3k Web \tF1 \tResponse\nTable 1: Overview of available resources for hallucination detection and evaluation. Task abbreviations: Machine Translation (MT), Paraphrase Generation (PG),\nDefinition Modeling (DM), Summarization (summ.), Question-Answering (QA), Information Retrieval (IR). *HaluEval test split is based on the train split from\ndatasets such as HotpotQA, CNN/DailyMail and OpenDialogueKG. All datasets are in English except MuShroom SemEval 2025 (language n=10).\n3. Feasibility of Hallucination Mitigation\nPrevious works criticize LLMs based on the hallucination\nphenomena and outline through defined formalisms that LLMs\nwill not be 100% free from the risk of hallucinations Xu et al.\n(2024), Banerjee et al. (2024). On the other hand, Xu et al.\n(2024) outlines that access to external knowledge can be an ef-\nfective mitigator of hallucinations although the scalability re-\nmains unclear. This raises essentially two requirements for\nimproving reliability of LLM systems, namely: (1) enabling\noutput interpretability, allowing the end-user to scrutinize the\noutput due to proneness of hallucinations; (2) conditioning an\nLLM on a reliable external knowledge source for mitigating\nhallucinations.\nTo this end, KGs are useful under the assumption that the\nknowledge graph triples are factually correct with respect to\nthe user query. If an LLM uses the KG triples effectively, then\nits output can be mapped back to the knowledge graph that in-\nformation originates from so it can be cross-checked and scru-\ntinized as needed.\n4. Detection of Hallucinations\nHallucination detection is the task of determining whether a\nparticular piece of text generated by an LLM contains any form\nof hallucinations. This is a difficult task due to the multi-faceted\nnature of the problem.\nGraphEval Sansford et al.',
            score: 0.13599041991869962,
            metadata: {
              text: 'MH, RC \tResponse\nSimpleQA Ope-\nnAI (2024)\nMulti-domain Hallc. Evaluation (QA) \tTest \t1 \t4.3k Web \tF1 \tResponse\nTable 1: Overview of available resources for hallucination detection and evaluation. Task abbreviations: Machine Translation (MT), Paraphrase Generation (PG),\nDefinition Modeling (DM), Summarization (summ.), Question-Answering (QA), Information Retrieval (IR). *HaluEval test split is based on the train split from\ndatasets such as HotpotQA, CNN/DailyMail and OpenDialogueKG. All datasets are in English except MuShroom SemEval 2025 (language n=10).\n3. Feasibility of Hallucination Mitigation\nPrevious works criticize LLMs based on the hallucination\nphenomena and outline through defined formalisms that LLMs\nwill not be 100% free from the risk of hallucinations Xu et al.\n(2024), Banerjee et al. (2024). On the other hand, Xu et al.\n(2024) outlines that access to external knowledge can be an ef-\nfective mitigator of hallucinations although the scalability re-\nmains unclear. This raises essentially two requirements for\nimproving reliability of LLM systems, namely: (1) enabling\noutput interpretability, allowing the end-user to scrutinize the\noutput due to proneness of hallucinations; (2) conditioning an\nLLM on a reliable external knowledge source for mitigating\nhallucinations.\nTo this end, KGs are useful under the assumption that the\nknowledge graph triples are factually correct with respect to\nthe user query. If an LLM uses the KG triples effectively, then\nits output can be mapped back to the knowledge graph that in-\nformation originates from so it can be cross-checked and scru-\ntinized as needed.\n4. Detection of Hallucinations\nHallucination detection is the task of determining whether a\nparticular piece of text generated by an LLM contains any form\nof hallucinations. This is a difficult task due to the multi-faceted\nnature of the problem.\nGraphEval Sansford et al.',
              userId: 'TtBUjB62HWUCSPU7dYGEEXui4ys8E2V3',
              endChar: 1896,
              fileName: 'Knowledge Graphs, Large Language Models, and Hallucinations: An NLP Perspective',
              fileType: 'pdf',
              createdAt: '2025-11-18T22:20:20.399Z',
              startChar: 0,
              chunkIndex: 7,
              documentId: 'cfc833b1-5ef8-411e-b4bb-7f5c1e057a7d',
            },
          },
          {
            text: 'types of hallucinations.\nIn summary, this position paper proposes a categorization of\nknowledge integration methods that use KGs as per Figure 2\nand consolidates available resources in Table 1. Furthermore,\nwe argue for the importance of the following open research di-\nrections in which KGs can play a critical role:\n1. Robust detection of hallucinations with a fine-grained\noverview of particular hallucinatory text spans\n2. Effective methods for integrating knowledge in LLMs that\nmove away from textual prompting\n3. Evaluation of factuality in a multiprompt, multilingual,\nand multitask space for an in-depth analysis of model per-\nformance\nThe remainder of this paper is structured as follows: Section 2\ndiscusses modern datasets and benchmarks, Section 3 discusses\nthe feasibility of mitigating hallucinations, Section 4 gives an\noverview of hallucination detection methods, Section 5 dis-\ncusses how additional knowledge can be integrated to mitigate\nhallucinations, and Section 6 outlines current methods for eval-\nuating hallucinations. Finally, Section 7 summarizes identified\nresearch gaps\n2. Available Resources for Evaluating Hallucinations\nConsidering the boom of LLMs in recent years, evaluation of\nhallucinations has become increasingly important due to the an-\nticipated high value that LLMs can provide for problem solving.\nThis has sparked an increase in dedicated evaluation datasets\nand benchmarks, Table 1 shows an overview.\nFor the LLM hallucination evaluation to be holistic, we ar-\ngue that evaluation needs to broadly cover different domains as\nwell as different tasks to test for different types of hallucina-\ntions. One of the major objectives for LLMs to be useful for\npractical applications is generalizability to multiple domains.\nTable 1 reveails that many of the datasets cover evaluation on a\nmulti-domain basis such as law, politics, medical, science and\ntechnology, art, finance, and others.',
            score: 0.12331179182599365,
            metadata: {
              text: 'types of hallucinations.\nIn summary, this position paper proposes a categorization of\nknowledge integration methods that use KGs as per Figure 2\nand consolidates available resources in Table 1. Furthermore,\nwe argue for the importance of the following open research di-\nrections in which KGs can play a critical role:\n1. Robust detection of hallucinations with a fine-grained\noverview of particular hallucinatory text spans\n2. Effective methods for integrating knowledge in LLMs that\nmove away from textual prompting\n3. Evaluation of factuality in a multiprompt, multilingual,\nand multitask space for an in-depth analysis of model per-\nformance\nThe remainder of this paper is structured as follows: Section 2\ndiscusses modern datasets and benchmarks, Section 3 discusses\nthe feasibility of mitigating hallucinations, Section 4 gives an\noverview of hallucination detection methods, Section 5 dis-\ncusses how additional knowledge can be integrated to mitigate\nhallucinations, and Section 6 outlines current methods for eval-\nuating hallucinations. Finally, Section 7 summarizes identified\nresearch gaps\n2. Available Resources for Evaluating Hallucinations\nConsidering the boom of LLMs in recent years, evaluation of\nhallucinations has become increasingly important due to the an-\nticipated high value that LLMs can provide for problem solving.\nThis has sparked an increase in dedicated evaluation datasets\nand benchmarks, Table 1 shows an overview.\nFor the LLM hallucination evaluation to be holistic, we ar-\ngue that evaluation needs to broadly cover different domains as\nwell as different tasks to test for different types of hallucina-\ntions. One of the major objectives for LLMs to be useful for\npractical applications is generalizability to multiple domains.\nTable 1 reveails that many of the datasets cover evaluation on a\nmulti-domain basis such as law, politics, medical, science and\ntechnology, art, finance, and others.',
              userId: 'TtBUjB62HWUCSPU7dYGEEXui4ys8E2V3',
              endChar: 1927,
              fileName: 'Knowledge Graphs, Large Language Models, and Hallucinations: An NLP Perspective',
              fileType: 'pdf',
              createdAt: '2025-11-18T22:20:20.399Z',
              startChar: 0,
              chunkIndex: 4,
              documentId: 'cfc833b1-5ef8-411e-b4bb-7f5c1e057a7d',
            },
          },
          {
            text: 'extraction.\n2. Robust evaluation that includes multilinguality, multi-\ntasks, and multiprompts. This gives a better insight into\nhow truly generalizable and robust a particular system can\nbe. Such robust evaluation is generally not included in\nmodern studies, where the evaluation is normally done us-\ning single prompts, single language, which normally is En-\nglish, and in most cases a single task.\n3. Hallucination detection with a fine-grained overview of\nhallucinatory text spans. Hallucination detection is the\nfirst step for mitigating hallucinations, therefore robust\nknowledge within detection can greatly benefit mitigation.\n4. Knowledge integration methods that move away from tex-\ntual prompt reliance, ideally in a parameter-efficient set-\nting. This is supported by the fragility towards prompt for-\nmatting and comprehension, context window limitations.\n5. Studies on mixing and matching fundamentally different\nmethods of hallucination mitigation methods. This can\nprovide an insight into how methods complement one-\nanother and can be particularly valuable for industry prac-\ntitioners when designing systems.\n6. Multilinguality for hallucination detection, evaluation, and\nknowledge integration.\nAcknowledgements\nThis work is supported by the Poul Due Jensens Fond\n(Grundfos Foundation).\nReferences\nI. Augenstein, T. Baldwin, M. Cha, T. Chakraborty, G. L. Ciampaglia, D. Cor-\nney, R. DiResta, E. Ferrara, S. Hale, A. Halevy, et al., Factuality challenges\nin the era of large language models and opportunities for fact-checking, Na-\nture Machine Intelligence (2024) 1–12.\nG. Puccetti, A. Rogers, C. Alzetta, F. Dell’Orletta, A. Esuli, AI ‘news’ con-\ntent farms are easy to make and hard to detect: A case study in Italian,\nin: L.-W. Ku, A. Martins, V. Srikumar (Eds.), Proceedings of the 62nd\nAnnual Meeting of the Association for Computational Linguistics (Vol-\nume 1: Long Papers), Association for Computational Linguistics, Bangkok,\nThailand, 2024, pp. 15312–15338.',
            score: 0.12185392551869963,
            metadata: {
              text: 'extraction.\n2. Robust evaluation that includes multilinguality, multi-\ntasks, and multiprompts. This gives a better insight into\nhow truly generalizable and robust a particular system can\nbe. Such robust evaluation is generally not included in\nmodern studies, where the evaluation is normally done us-\ning single prompts, single language, which normally is En-\nglish, and in most cases a single task.\n3. Hallucination detection with a fine-grained overview of\nhallucinatory text spans. Hallucination detection is the\nfirst step for mitigating hallucinations, therefore robust\nknowledge within detection can greatly benefit mitigation.\n4. Knowledge integration methods that move away from tex-\ntual prompt reliance, ideally in a parameter-efficient set-\nting. This is supported by the fragility towards prompt for-\nmatting and comprehension, context window limitations.\n5. Studies on mixing and matching fundamentally different\nmethods of hallucination mitigation methods. This can\nprovide an insight into how methods complement one-\nanother and can be particularly valuable for industry prac-\ntitioners when designing systems.\n6. Multilinguality for hallucination detection, evaluation, and\nknowledge integration.\nAcknowledgements\nThis work is supported by the Poul Due Jensens Fond\n(Grundfos Foundation).\nReferences\nI. Augenstein, T. Baldwin, M. Cha, T. Chakraborty, G. L. Ciampaglia, D. Cor-\nney, R. DiResta, E. Ferrara, S. Hale, A. Halevy, et al., Factuality challenges\nin the era of large language models and opportunities for fact-checking, Na-\nture Machine Intelligence (2024) 1–12.\nG. Puccetti, A. Rogers, C. Alzetta, F. Dell’Orletta, A. Esuli, AI ‘news’ con-\ntent farms are easy to make and hard to detect: A case study in Italian,\nin: L.-W. Ku, A. Martins, V. Srikumar (Eds.), Proceedings of the 62nd\nAnnual Meeting of the Association for Computational Linguistics (Vol-\nume 1: Long Papers), Association for Computational Linguistics, Bangkok,\nThailand, 2024, pp. 15312–15338.',
              userId: 'TtBUjB62HWUCSPU7dYGEEXui4ys8E2V3',
              endChar: 1985,
              fileName: 'Knowledge Graphs, Large Language Models, and Hallucinations: An NLP Perspective',
              fileType: 'pdf',
              createdAt: '2025-11-18T22:20:20.399Z',
              startChar: 0,
              chunkIndex: 16,
              documentId: 'cfc833b1-5ef8-411e-b4bb-7f5c1e057a7d',
            },
          },
          {
            text: 'metrics, such as BERTScore Zhang* et al.\n(2020), and BARTScore Yuan et al. (2021) that evaluate se-\nmantic similarity between two pieces of text, e.g., LLM output\nand reference text. Additionally, textual entailment models can\nbe used to classify whether a part of a hypothesis (LLM output)\nentails or contradicts a given premise (factual knowledge).\nMethods such as BERTScore, BARTScore, and entailment\nmodels process a whole hypothesis holistically. However, hal-\nlucinations can be subtle, and even a single incorrect word can\nresult in a large semantic mismatch. Hence, these methods tend\nto fail to accurately describe hallucinations, as they are not able\nto capture granular word-level details.\nTherefore, in order to discover reliable methods for halluci-\nnation mitigation there is a need for robust evaluation, which\nis currently not present although being an active research di-\nrection. There are numerous benchmarks proposed for evaluat-\ning hallucination detection models as shown in Table 1. How-\never, the majority of them focuses on response-level granular-\nity. Considering the subtleness of hallucinations, it is neces-\nsary to have a finer granularity at , for example, sentence-level\nas proposed in the FELM benchmark Zhao et al. (2024) or\neven span-level as per MuShroom-2025 V´azquez et al. (2025).\nThe MuShroom-2025 shared task aims to enable research by\nproposing an open-sourced dataset for span-level hallucination\ndetection, meaning that the task requires participants to identify\nexact portions of the text in which hallucinations occur. If the\nproblem of hallucination detection can be solved at scale, then\nthis provides a stable foundation for discovering effective and\nscalable methods for mitigating certain types of hallucinations.\nIn summary, this position paper proposes a categorization of\nknowledge integration methods that use KGs as per Figure 2\nand consolidates available resources in Table 1.',
            score: 0.12040195439999998,
            metadata: {
              text: 'metrics, such as BERTScore Zhang* et al.\n(2020), and BARTScore Yuan et al. (2021) that evaluate se-\nmantic similarity between two pieces of text, e.g., LLM output\nand reference text. Additionally, textual entailment models can\nbe used to classify whether a part of a hypothesis (LLM output)\nentails or contradicts a given premise (factual knowledge).\nMethods such as BERTScore, BARTScore, and entailment\nmodels process a whole hypothesis holistically. However, hal-\nlucinations can be subtle, and even a single incorrect word can\nresult in a large semantic mismatch. Hence, these methods tend\nto fail to accurately describe hallucinations, as they are not able\nto capture granular word-level details.\nTherefore, in order to discover reliable methods for halluci-\nnation mitigation there is a need for robust evaluation, which\nis currently not present although being an active research di-\nrection. There are numerous benchmarks proposed for evaluat-\ning hallucination detection models as shown in Table 1. How-\never, the majority of them focuses on response-level granular-\nity. Considering the subtleness of hallucinations, it is neces-\nsary to have a finer granularity at , for example, sentence-level\nas proposed in the FELM benchmark Zhao et al. (2024) or\neven span-level as per MuShroom-2025 V´azquez et al. (2025).\nThe MuShroom-2025 shared task aims to enable research by\nproposing an open-sourced dataset for span-level hallucination\ndetection, meaning that the task requires participants to identify\nexact portions of the text in which hallucinations occur. If the\nproblem of hallucination detection can be solved at scale, then\nthis provides a stable foundation for discovering effective and\nscalable methods for mitigating certain types of hallucinations.\nIn summary, this position paper proposes a categorization of\nknowledge integration methods that use KGs as per Figure 2\nand consolidates available resources in Table 1.',
              userId: 'TtBUjB62HWUCSPU7dYGEEXui4ys8E2V3',
              endChar: 1935,
              fileName: 'Knowledge Graphs, Large Language Models, and Hallucinations: An NLP Perspective',
              fileType: 'pdf',
              createdAt: '2025-11-18T22:20:20.399Z',
              startChar: 0,
              chunkIndex: 3,
              documentId: 'cfc833b1-5ef8-411e-b4bb-7f5c1e057a7d',
            },
          },
        ],
        model: 'openai',
        createdAt: '2025-11-29T19:11:56.941Z',
      },
    ]);
  }, []);

  console.log({ messages });

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 min-h-0 max-h-[calc(100%-190px)] flex flex-col overflow-hidden">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full p-4 qa-scroll-area-root"
        >
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center min-h-0">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ask questions about your document</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Get instant answers powered by AI. Ask about key points, summaries, or specific details in your
                  document.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}

                <div className={cn('flex flex-col gap-2 max-w-[80%]', message.role === 'user' && 'items-end')}>
                  <Card
                    className={cn(
                      'p-3',
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </Card>

                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {message.sources.slice(0, 3).map((source, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Source {idx + 1}
                          {source.metadata.pageNumber && ` (Page ${source.metadata.pageNumber})`}
                        </Badge>
                      ))}
                      {message.sources.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          +{message.sources.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {message.role === 'assistant' && message.model && (
                    <span className="text-xs text-muted-foreground">Powered by {message.model}</span>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <Card className="p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document..."
            disabled={loading}
            className="flex-1 resize-none overflow-y-auto max-h-32 min-h-[40px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
