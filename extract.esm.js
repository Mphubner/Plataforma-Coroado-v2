import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8');

const startIdx = content.indexOf('export type CellMember = {');
const endIdx = content.indexOf('export function AdminJornadaTab()');

if (startIdx !== -1 && endIdx !== -1) {
    const extracted = content.substring(startIdx, endIdx);
    
    // We need to inject imports at the top
    const imports = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp, Calendar, MapPin, BookOpen, ShoppingBag, ArrowRight, CheckCircle2, Clock, ChevronRight, Star, Plus, Filter, Search, Download, QrCode, Share2, MessageSquare, Heart, Gift, CheckSquare, DollarSign, UserPlus, Shield, Settings, Bell, X, Image as ImageIcon, Video, Paperclip, Youtube, Play, Link as LinkIcon, FileText, Check, ListTodo, User, MoreVertical, RefreshCw, Award, Sparkles, PlayCircle, Captions, AlertTriangle, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRCode } from 'react-qrcode-logo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useSchool } from '../App'; 

`;

    fs.writeFileSync('src/components/CellsView.tsx', imports + extracted);
    
    // Let's replace the whole section with a blank, EXCEPT we want to preserve the Cell context export if it is used... 
    // actually we will move context and types to CellsView too. So we can just remove them all.
    const appExtracted = content.substring(0, startIdx) + "\n" + content.substring(endIdx);
    fs.writeFileSync('src/App.tsx', appExtracted);

    console.log("Extraction completed.");
} else {
    console.log("Could not find boundaries.");
}
