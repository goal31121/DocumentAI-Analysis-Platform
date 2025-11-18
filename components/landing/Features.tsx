'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileSearch, Zap, Shield, BarChart3, Globe } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Q&A',
    description:
      'Ask questions about your documents and get instant, accurate answers powered by GPT-4, Claude, and Gemini.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: FileSearch,
    title: 'Multi-Format Support',
    description: 'Process PDFs, DOCX, Excel files, and even scanned documents with OCR technology.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process 100-page documents in under 30 seconds with our optimized RAG pipeline.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents are encrypted and stored securely. We never share your data with third parties.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Extract entities, analyze sentiment, and visualize insights with interactive dashboards.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: Globe,
    title: 'Multi-Model AI',
    description: 'Intelligent model selection with automatic fallback ensures reliable answers every time.',
    gradient: 'from-primary/20 to-primary/5',
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-24 bg-muted/30"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block mb-4"
          >
            <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              Features
            </span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Powerful Features for Document Intelligence
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to extract insights from your documents
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full group card-hover border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div
                      className={`p-3 rounded-lg bg-gradient-to-br ${feature.gradient} w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
