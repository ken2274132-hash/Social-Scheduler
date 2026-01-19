'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
    {
        question: "How does the AI work?",
        answer: "We use advanced AI models (via Groq) to analyze your intent and media. It generates tailored hooks, captions, and hashtags optimized for engagement on each specific platform."
    },
    {
        question: "Do I need a Meta Developer account?",
        answer: "No! We've handled all the complex setup. You just click 'Connect', log in with your Facebook/Instagram account, and you're ready to start scheduling."
    },
    {
        question: "Which platforms are supported?",
        answer: "Currently, we fully support Instagram Professional (Business & Creator) and Facebook Pages. We are working on adding more platforms soon!"
    },
    {
        question: "Can I schedule posts for multiple accounts?",
        answer: "Yes, our 'Business' plan allows you to manage multiple workspaces and connect multiple brand accounts simultaneously."
    }
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section id="faq" className="py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all shadow-sm"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left"
                            >
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {faq.question}
                                </span>
                                {openIndex === index ? (
                                    <ChevronUp className="text-blue-600" size={20} />
                                ) : (
                                    <ChevronDown className="text-gray-400" size={20} />
                                )}
                            </button>
                            {openIndex === index && (
                                <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed animate-in fade-in slide-in-from-top-2">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
