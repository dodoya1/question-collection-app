"use client";

import { DialogFooter } from "@/components/ui/dialog";

import type React from "react";

import { useState, useRef, useId, type ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Printer,
  Plus,
  Trash2,
  FileUp,
  Download,
  HelpCircle,
} from "lucide-react";
import Papa from "papaparse";

interface QAPair {
  id: string;
  question: string;
  answer: string;
}

export default function QASheetCreator() {
  const idPrefix = useId();
  const [pairs, setPairs] = useState<QAPair[]>([
    { id: "0", question: "", answer: "" },
  ]);
  const [bulkText, setBulkText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAnswerRef = useRef<HTMLTextAreaElement>(null);

  // 一意のIDを生成する関数
  const generateUniqueId = () => {
    return String(Date.now() + Math.random().toString(36).substr(2, 9));
  };

  // Add a new empty pair
  const addPair = () => {
    const newId = generateUniqueId();
    setPairs([...pairs, { id: newId, question: "", answer: "" }]);

    // 新しい質問フィールドにフォーカスを移動
    setTimeout(() => {
      const newQuestionField = document.getElementById(
        `question-${idPrefix}-${newId}`
      );
      if (newQuestionField) {
        newQuestionField.focus();
      }
    }, 0);
  };

  // Update a specific pair
  const updatePair = (
    id: string,
    field: "question" | "answer",
    value: string
  ) => {
    const newPairs = pairs.map((pair) =>
      pair.id === id ? { ...pair, [field]: value } : pair
    );
    setPairs(newPairs);
  };

  // Remove a specific pair
  const removePair = (id: string) => {
    if (pairs.length <= 1) {
      setPairs([{ id: "0", question: "", answer: "" }]);
      return;
    }
    setPairs(pairs.filter((pair) => pair.id !== id));
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    id: string,
    field: "question" | "answer"
  ) => {
    // デフォルトのTabキーの動作のみを許可
    if (e.key === "Tab") return;

    // 最後の回答フィールドでCtrl+Enter（またはCmd+Enter）を押した場合
    if (
      field === "answer" &&
      id === pairs[pairs.length - 1].id &&
      e.key === "Enter" &&
      (e.ctrlKey || e.metaKey)
    ) {
      e.preventDefault();
      addPair();
      return;
    }

    // その他のEnterキーの場合は改行を許可
    if (e.key === "Enter" && !e.shiftKey) {
      return;
    }
  };

  // Handle bulk import from text
  const handleBulkImport = (format: string) => {
    if (!bulkText.trim()) return;

    const newPairs: QAPair[] = [];

    if (format === "alternating") {
      // Alternating lines: question, answer, question, answer...
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          newPairs.push({
            id: generateUniqueId(),
            question: lines[i],
            answer: lines[i + 1],
          });
        } else {
          newPairs.push({
            id: generateUniqueId(),
            question: lines[i],
            answer: "",
          });
        }
      }
    } else if (format === "tabDelimited") {
      // Tab or pipe delimited: question\tanswer or question|answer
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      lines.forEach((line) => {
        // Check for tab first, then pipe as delimiter
        const delimiter = line.includes("\t") ? "\t" : "|";
        const parts = line.split(delimiter).map((part) => part.trim());

        if (parts.length >= 2) {
          newPairs.push({
            id: generateUniqueId(),
            question: parts[0],
            answer: parts[1],
          });
        } else if (parts.length === 1 && parts[0]) {
          newPairs.push({
            id: generateUniqueId(),
            question: parts[0],
            answer: "",
          });
        }
      });
    } else if (format === "csv") {
      // CSV format
      try {
        const results = Papa.parse(bulkText, {
          header: false,
          skipEmptyLines: true,
        });
        if (results.data && Array.isArray(results.data)) {
          results.data.forEach((row: any) => {
            if (Array.isArray(row) && row.length >= 2) {
              newPairs.push({
                id: generateUniqueId(),
                question: row[0]?.toString() || "",
                answer: row[1]?.toString() || "",
              });
            }
          });
        }
      } catch (error) {
        console.error("CSV parsing error:", error);
        alert("CSVの解析中にエラーが発生しました。形式を確認してください。");
        return;
      }
    }

    if (newPairs.length > 0) {
      // Replace or append based on whether there are existing non-empty pairs
      const hasContent = pairs.some(
        (pair) => pair.question.trim() !== "" || pair.answer.trim() !== ""
      );

      if (hasContent) {
        // Append to existing content
        setPairs([...pairs, ...newPairs]);
      } else {
        // Replace the empty pair
        setPairs(newPairs);
      }

      setBulkText("");
    }
  };

  // Handle CSV file import
  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      if (csvData) {
        try {
          const results = Papa.parse(csvData, {
            header: false,
            skipEmptyLines: true,
          });
          if (results.data && Array.isArray(results.data)) {
            const newPairs = results.data.map((row: any) => ({
              id: generateUniqueId(),
              question: (Array.isArray(row) && row[0]?.toString()) || "",
              answer: (Array.isArray(row) && row[1]?.toString()) || "",
            }));

            if (newPairs.length > 0) {
              // Replace or append based on whether there are existing non-empty pairs
              const hasContent = pairs.some(
                (pair) =>
                  pair.question.trim() !== "" || pair.answer.trim() !== ""
              );

              if (hasContent) {
                // Append to existing content
                setPairs([...pairs, ...newPairs]);
              } else {
                // Replace the empty pair
                setPairs(newPairs);
              }
            }
          }
        } catch (error) {
          console.error("CSV file parsing error:", error);
          alert("CSVファイルの解析中にエラーが発生しました。");
        }
      }
    };
    reader.readAsText(file);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle print
  const handlePrint = () => {
    // Filter out empty pairs before printing
    const filteredPairs = pairs.filter(
      (pair) => pair.question.trim() !== "" || pair.answer.trim() !== ""
    );

    if (filteredPairs.length === 0) {
      alert("印刷するには少なくとも1つの質問と回答を入力してください。");
      return;
    }

    // Store original pairs
    const originalPairs = [...pairs];

    // Set filtered pairs for printing
    setPairs(filteredPairs);

    // Print after a short delay to ensure state update
    setTimeout(() => {
      window.print();

      // Restore original pairs after printing
      setTimeout(() => setPairs(originalPairs), 500);
    }, 100);
  };

  // Export as CSV
  const exportAsCSV = () => {
    try {
      const filteredPairs = pairs.filter(
        (pair) => pair.question.trim() !== "" || pair.answer.trim() !== ""
      );
      if (filteredPairs.length === 0) {
        alert(
          "エクスポートするには少なくとも1つの質問と回答を入力してください。"
        );
        return;
      }

      const csvData = filteredPairs.map((pair) => [pair.question, pair.answer]);
      const csv = Papa.unparse(csvData);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert("CSVエクスポート中にエラーが発生しました。");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="print:hidden">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">質問回答シート作成ツール</h1>

          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>使い方ガイド</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-medium">基本操作</h3>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>質問と回答を入力フォームに直接入力できます</li>
                      <li>Tabキーで次のフィールドに移動できます</li>
                      <li>
                        最後の回答フィールドでCtrl+Enter（MacではCmd+Enter）を押すと新しい質問が追加されます
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium">一括インポート</h3>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>交互形式: 1行目に質問、2行目に回答の形式</li>
                      <li>区切り形式: 質問と回答をタブまたは | で区切る形式</li>
                      <li>CSV形式: カンマ区切りのCSVデータ</li>
                      <li>CSVファイルのインポートも可能です</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium">印刷</h3>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>
                        印刷ボタンをクリックするとA4用紙に適した形式で印刷されます
                      </li>
                      <li>質問は左側、回答は右側に表示されます</li>
                      <li>質問と回答の上部が揃うように配置されます</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="direct" className="mb-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="direct">直接入力</TabsTrigger>
            <TabsTrigger value="import">一括インポート</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="mt-4">
            <div className="space-y-4">
              {pairs.map((pair, index) => (
                <Card key={pair.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`question-${idPrefix}-${pair.id}`}>
                          質問 {index + 1}
                        </Label>
                        <Textarea
                          id={`question-${idPrefix}-${pair.id}`}
                          value={pair.question}
                          onChange={(e) =>
                            updatePair(pair.id, "question", e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, pair.id, "question")
                          }
                          placeholder="質問を入力してください"
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`answer-${idPrefix}-${pair.id}`}>
                          回答 {index + 1}
                          {index === pairs.length - 1 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Ctrl+Enterで新しい質問を追加)
                            </span>
                          )}
                        </Label>
                        <Textarea
                          id={`answer-${idPrefix}-${pair.id}`}
                          value={pair.answer}
                          onChange={(e) =>
                            updatePair(pair.id, "answer", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, pair.id, "answer")}
                          placeholder="回答を入力してください"
                          className="min-h-[100px]"
                          ref={
                            index === pairs.length - 1 ? lastAnswerRef : null
                          }
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="mt-4"
                      onClick={() => removePair(pair.id)}
                      disabled={
                        pairs.length === 1 && !pair.question && !pair.answer
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-center mt-6">
                <Button onClick={addPair}>
                  <Plus className="h-4 w-4 mr-2" />
                  質問を追加
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="alternating">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="alternating">交互形式</TabsTrigger>
                    <TabsTrigger value="tabDelimited">区切り形式</TabsTrigger>
                    <TabsTrigger value="csv">CSV形式</TabsTrigger>
                  </TabsList>

                  <TabsContent value="alternating">
                    <p className="text-sm text-muted-foreground mb-2">
                      1行目に質問、2行目に回答、3行目に次の質問...という形式で入力してください。
                    </p>
                    <div className="bg-muted p-2 rounded text-xs font-mono mb-2">
                      東京の人口は？
                      <br />
                      約1,400万人
                      <br />
                      日本の首都は？
                      <br />
                      東京
                    </div>
                  </TabsContent>

                  <TabsContent value="tabDelimited">
                    <p className="text-sm text-muted-foreground mb-2">
                      質問と回答をタブまたは |
                      で区切って、1行に1ペアずつ入力してください。
                    </p>
                    <div className="bg-muted p-2 rounded text-xs font-mono mb-2">
                      東京の人口は？ | 約1,400万人
                      <br />
                      日本の首都は？ | 東京
                    </div>
                  </TabsContent>

                  <TabsContent value="csv">
                    <p className="text-sm text-muted-foreground mb-2">
                      CSVフォーマットで入力してください。1列目が質問、2列目が回答です。
                    </p>
                    <div className="bg-muted p-2 rounded text-xs font-mono mb-2">
                      "東京の人口は？","約1,400万人"
                      <br />
                      "日本の首都は？","東京"
                    </div>
                  </TabsContent>

                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="ここに質問と回答を入力してください"
                    className="min-h-[200px] mt-4"
                  />

                  <div className="flex justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        className="hidden"
                        id="csv-file-input"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        CSVファイルをインポート
                      </Button>
                    </div>

                    <Button
                      onClick={() =>
                        handleBulkImport(
                          document
                            .querySelector(
                              '[role="tablist"] [data-state="active"]'
                            )
                            ?.getAttribute("value") || "alternating"
                        )
                      }
                    >
                      インポート
                    </Button>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap justify-between gap-2 mb-8">
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="default">
              <Printer className="h-4 w-4 mr-2" />
              印刷
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  エクスポート
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>CSVとしてエクスポート</DialogTitle>
                  <DialogDescription>
                    質問と回答のペアをCSVファイルとして保存します。
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="filename" className="text-right">
                      ファイル名
                    </Label>
                    <Input
                      id="filename"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">キャンセル</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={exportAsCSV}>エクスポート</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Print layout */}
      <div className="hidden print:block">
        <div className="w-[210mm] min-h-[297mm] mx-auto">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="border-r pr-4">
              <h3 className="text-lg font-bold text-center mb-4">質問</h3>
            </div>
            <div className="pl-4">
              <h3 className="text-lg font-bold text-center mb-4">回答</h3>
            </div>
          </div>

          {pairs
            .filter(
              (pair) => pair.question.trim() !== "" || pair.answer.trim() !== ""
            )
            .map((pair, index) => (
              <div
                key={`print-${pair.id}`}
                className="grid grid-cols-2 gap-4 page-break-inside-avoid mb-6"
              >
                <div className="border-r pr-4">
                  <p className="font-medium">問題 {index + 1}:</p>
                  <p className="whitespace-pre-line">{pair.question}</p>
                </div>
                <div className="pl-4">
                  <p className="font-medium">回答 {index + 1}:</p>
                  <p className="whitespace-pre-line">{pair.answer}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
