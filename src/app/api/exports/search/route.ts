import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchJobId = searchParams.get('searchJobId');

  if (!searchJobId) {
    return new Response(
      JSON.stringify({ error: 'searchJobId is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get search job
    const searchJob = await db.searchJob.findUnique({
      where: { id: searchJobId },
      include: {
        results: {
          include: {
            lead: true,
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
    });

    if (!searchJob) {
      return new Response(
        JSON.stringify({ error: 'Search job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (searchJob.results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No results found in this search' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');

    // Define columns
    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Business Name', key: 'businessName', width: 30 },
      { header: 'Category', key: 'primaryCategory', width: 20 },
      { header: 'Phone', key: 'phonePrimary', width: 20 },
      { header: 'Website', key: 'websiteUrl', width: 28 },
      { header: 'Address', key: 'addressLine1', width: 40 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Postal Code', key: 'postalCode', width: 14 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Google Maps URL', key: 'googleMapsUrl', width: 32 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Review Count', key: 'reviewCount', width: 14 },
      { header: 'Latitude', key: 'latitude', width: 14 },
      { header: 'Longitude', key: 'longitude', width: 14 },
      { header: 'Lead Score', key: 'leadScore', width: 12 },
      { header: 'Business Status', key: 'businessStatus', width: 18 },
    ];

    // Add rows with proper formatting
    searchJob.results.forEach((result: any) => {
      const lead = result.lead;
      sheet.addRow({
        rank: result.rank || '',
        businessName: lead.businessName || '',
        primaryCategory: lead.primaryCategory || '',
        phonePrimary: lead.phonePrimary || '',
        websiteUrl: lead.websiteUrl || '',
        addressLine1: lead.addressLine1 || '',
        city: lead.city || '',
        state: lead.state || '',
        postalCode: lead.postalCode || '',
        country: lead.country || '',
        googleMapsUrl: lead.googleMapsUrl || '',
        rating: lead.rating || '',
        reviewCount: lead.reviewCount || '',
        latitude: lead.latitude || '',
        longitude: lead.longitude || '',
        leadScore: lead.leadScore || '',
        businessStatus: lead.businessStatus || '',
      });
    });

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };

    // Generate filename
    const fileName = `leads-${searchJob.city}-${searchJob.category}-${Date.now()}.xlsx`;

    // Record export
    await db.exportFile.create({
      data: {
        fileName,
        format: 'XLSX',
        rowCount: searchJob.results.length,
        filtersJson: {
          searchJobId,
          city: searchJob.city,
          category: searchJob.category,
          subcategory: searchJob.subcategory,
        },
      },
    });

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export search results error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to export results',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
