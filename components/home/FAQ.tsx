'use client';

import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "../../src/components/ui/accordion";

export default function FAQ() {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Common Questions
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Everything you need to know about Last Man Standing HQ.
          </p>
        </div>

        <div className="mx-auto max-w-3xl border-t border-zinc-800">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-zinc-800">
              <AccordionTrigger className="text-lg font-medium text-white py-6">
                What is Last Man Standing HQ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Last Man Standing HQ is a prediction competition involving skills and luck. You pick one team to win each gameweek. 
                If your team wins, you progress to the next round. If they draw or lose, you&apos;re out. Each team can only be selected once during the competition.
                The last player remaining wins the prize pot. If you are eliminated, you are offered the chance to buy back in once. If all players are eliminated, the competition becomes a rollover and the prize pot is carried over to the next competition.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b border-zinc-800">
              <AccordionTrigger className="text-lg font-medium text-white py-6">
                What if the team I pick doesn&apos;t win?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                If your selected team doesn&apos;t win (they draw or lose), you&apos;re eliminated from the competition. 
                However, some competitions may offer rollover options or buy-back opportunities - check the description of the competition you&apos;ve entered.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b border-zinc-800">
              <AccordionTrigger className="text-lg font-medium text-white py-6">
                What is a rollover?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
               A rollover happens when all players are eliminated from a competition and the prize pot is carried over to the next competition.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b border-zinc-800">
              <AccordionTrigger className="text-lg font-medium text-white py-6">
                If I am eliminated from a competition can I buy back in?
              </AccordionTrigger>
              <AccordionContent className="text-gray-400">
                Some competitions offer buy-back options at specific stages, allowing eliminated players to re-enter by paying an additional fee. 
                This feature is not available in all competitions but will be noted in its description. Check the specific competition description to see if buy-backs are permitted.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
} 