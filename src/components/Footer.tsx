
import React from 'react';
import { Github, Twitter, MessageCircle, Heart, Code, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <h3 className="font-semibold">About Stellar Flow</h3>
            <p className="text-sm text-muted-foreground">
              Built with passion for the Stellar Network. Empowering automated payments and making blockchain technology accessible.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold">Resources</h3>
            <div className="space-y-2">
              <a href="https://www.stellar.org/developers" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground block">
                Developer Resources
              </a>
              <a href="https://www.stellar.org/learn" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground block">
                Learn Stellar
              </a>
              <a href="https://laboratory.stellar.org/" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground block">
                Stellar Laboratory
              </a>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold">Community</h3>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://github.com/naman23j" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://x.com/NamanDangi1847?t=2fgGCxyyTUbnyht88yi0Pg&s=09" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://discord.gg/DSMqf4cE" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <MessageCircle className="h-5 w-5" />
                  <span className="sr-only">Discord</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>Built with love on the Stellar Network</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code className="h-4 w-4" />
            <span>All transactions are on Testnet</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Documentation available on GitHub</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
